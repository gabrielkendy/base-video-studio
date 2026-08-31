"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import { useJobs } from "@/hooks/useJobs";
import { modelCategory, type ModelCategory } from "@/lib/fal/models";
import type { InputImage, Job, JobConfig, Model } from "@/types";

export type StudioMode = ModelCategory; // "create" | "edit" | "motion"

interface StudioState {
  userName: string;
  models: Model[];
  modelsForMode: Model[];
  mode: StudioMode;
  setMode: (m: StudioMode) => void;

  selectedModel: Model | null;
  setSelectedModelId: (id: string) => void;

  inputVideoUrl: string | null;
  setInputVideoUrl: (url: string | null) => void;
  characterOrientation: "image" | "video";
  setCharacterOrientation: (v: "image" | "video") => void;

  prompt: string;
  setPrompt: (v: string) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;

  images: InputImage[];
  addImage: (img: { url: string; storagePath?: string }) => void;
  removeImage: (index: number) => void;
  reorderImages: (from: number, to: number) => void;
  clearImages: () => void;

  config: JobConfig;
  setConfig: (patch: Partial<JobConfig>) => void;

  jobs: Job[];
  jobsLoading: boolean;
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  selectedJob: Job | null;

  submitting: boolean;
  submit: () => Promise<void>;
  reusePrompt: (job: Job) => void;
}

const Ctx = createContext<StudioState | null>(null);

export function StudioProvider({
  models,
  userName,
  children,
}: {
  models: Model[];
  userName: string;
  children: React.ReactNode;
}) {
  const { jobs, loading: jobsLoading } = useJobs();

  const [mode, setMode] = useState<StudioMode>("create");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id ?? ""
  );
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [images, setImages] = useState<InputImage[]>([]);
  const [config, setConfigState] = useState<JobConfig>({});
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // trava anti duplo-clique
  const [inputVideoUrl, setInputVideoUrl] = useState<string | null>(null);
  const [characterOrientation, setCharacterOrientation] = useState<
    "image" | "video"
  >("video");

  // Modelos disponíveis na aba (categoria) atual
  const modelsForMode = useMemo(
    () => models.filter((m) => modelCategory(m.endpoint) === mode),
    [models, mode]
  );

  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  // Ao trocar de aba, seleciona o 1º modelo da categoria e limpa o vídeo
  useEffect(() => {
    const current = models.find((m) => m.id === selectedModelId);
    const currentCat = current ? modelCategory(current.endpoint) : null;
    if (currentCat !== mode) {
      const first = modelsForMode[0];
      if (first) setSelectedModelId(first.id);
    }
    setInputVideoUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Ao trocar de modelo, reseta a config para valores válidos do modelo.
  useEffect(() => {
    if (!selectedModel) return;
    setConfigState({
      duration: selectedModel.durations[0],
      aspectRatio: selectedModel.aspect_ratios[0],
      resolution:
        selectedModel.resolutions[selectedModel.resolutions.length - 1],
      generateAudio: true,
    });
    // corta imagens excedentes se o novo modelo aceita menos
    setImages((prev) => prev.slice(0, selectedModel.max_images));
  }, [selectedModel]);

  const addImage = useCallback(
    (img: { url: string; storagePath?: string }) => {
      setImages((prev) => {
        const max = selectedModel?.max_images ?? 1;
        if (prev.length >= max) {
          toast.error(`Este modelo aceita no máximo ${max} imagem(ns).`);
          return prev;
        }
        return [
          ...prev,
          { url: img.url, storagePath: img.storagePath, order: prev.length },
        ];
      });
    },
    [selectedModel]
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((img, i) => ({ ...img, order: i }))
    );
  }, []);

  const reorderImages = useCallback((from: number, to: number) => {
    setImages((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((img, i) => ({ ...img, order: i }));
    });
  }, []);

  const clearImages = useCallback(() => setImages([]), []);

  const setConfig = useCallback((patch: Partial<JobConfig>) => {
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectedJob = useMemo(() => {
    if (selectedJobId) {
      return jobs.find((j) => j.id === selectedJobId) ?? null;
    }
    // por padrão mostra o job mais recente
    return jobs[0] ?? null;
  }, [jobs, selectedJobId]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return; // evita disparo duplicado
    if (!selectedModel) {
      toast.error("Selecione um modelo.");
      return;
    }
    const cat = modelCategory(selectedModel.endpoint);

    // Validações por categoria
    if (cat === "edit" && !inputVideoUrl) {
      toast.error("Envie o vídeo que você quer editar.");
      return;
    }
    if (cat === "motion") {
      if (!inputVideoUrl) {
        toast.error("Envie o vídeo de movimento (referência).");
        return;
      }
      if (images.length === 0) {
        toast.error("Envie a imagem do personagem.");
        return;
      }
    }
    if (cat === "create") {
      if (!prompt.trim()) {
        toast.error("Escreva um prompt descrevendo o vídeo.");
        return;
      }
      if (!selectedModel.supports_text && images.length === 0) {
        toast.error("Este modelo precisa de pelo menos uma imagem.");
        return;
      }
    } else if (!prompt.trim() && cat === "edit") {
      toast.error("Descreva a edição que você quer no prompt.");
      return;
    }

    const type = images.length > 0 || inputVideoUrl ? "IMAGE_TO_VIDEO" : "TEXT_TO_VIDEO";

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel.id,
          type,
          prompt: prompt.trim() || undefined,
          negativePrompt: negativePrompt.trim() || undefined,
          inputImages: images,
          config: {
            ...config,
            inputVideoUrl: inputVideoUrl ?? undefined,
            characterOrientation:
              cat === "motion" ? characterOrientation : undefined,
          },
        }),
      });
      if (res.status === 201) {
        const { job } = await res.json();
        toast.success("Na fila! Começa a processar em instantes.");
        setSelectedJobId(job.id);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(`Não foi possível gerar (${data.error ?? res.status}).`);
      }
    } catch {
      toast.error("Erro de conexão ao criar o job.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [
    selectedModel,
    images,
    prompt,
    negativePrompt,
    config,
    inputVideoUrl,
    characterOrientation,
  ]);

  const reusePrompt = useCallback(
    (job: Job) => {
      setMode(modelCategory(job.model_id));
      setPrompt(job.prompt ?? "");
      setNegativePrompt(job.negative_prompt ?? "");
      if (job.model_id !== selectedModelId) setSelectedModelId(job.model_id);
      setConfigState({
        duration: job.config?.duration,
        aspectRatio: job.config?.aspect_ratio,
        resolution: job.config?.resolution,
        generateAudio: job.config?.generate_audio ?? true,
      });
      setInputVideoUrl(job.config?.input_video_url ?? null);
      setCharacterOrientation(job.config?.character_orientation ?? "video");
      setImages((job.input_images ?? []).map((i, idx) => ({ ...i, order: idx })));
      toast.success("Configuração reaproveitada no painel.");
    },
    [selectedModelId]
  );

  const value: StudioState = {
    userName,
    models,
    modelsForMode,
    mode,
    setMode,
    selectedModel,
    setSelectedModelId,
    inputVideoUrl,
    setInputVideoUrl,
    characterOrientation,
    setCharacterOrientation,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    images,
    addImage,
    removeImage,
    reorderImages,
    clearImages,
    config,
    setConfig,
    jobs,
    jobsLoading,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    submitting,
    submit,
    reusePrompt,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudio deve ser usado dentro de StudioProvider");
  return ctx;
}
