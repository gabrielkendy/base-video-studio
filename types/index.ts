// ===========================================================================
// Tipos compartilhados entre frontend e backend
// ===========================================================================

export type JobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type JobType = "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO";

export type MediaKind = "VIDEO" | "IMAGE" | "AUDIO";

export interface Model {
  id: string;
  kind: MediaKind;
  name: string;
  description: string | null;
  endpoint: string;
  supports_image: boolean;
  supports_text: boolean;
  max_images: number;
  durations: number[];
  aspect_ratios: string[];
  resolutions: string[];
  point_cost: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface InputImage {
  url: string;
  order: number;
  storagePath?: string;
}

export interface JobConfig {
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  inputVideoUrl?: string; // vídeo de entrada (edit/motion)
  characterOrientation?: "image" | "video"; // motion: de onde vem o cenário
}

export interface Asset {
  id: string;
  kind: MediaKind;
  url: string;
  storage_path: string | null;
  source: "upload" | "generation";
  job_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  created_by: string | null;
  model_id: string;
  type: JobType;
  status: JobStatus;

  prompt: string | null;
  negative_prompt: string | null;
  input_images: InputImage[];
  config: {
    duration?: number;
    aspect_ratio?: string;
    resolution?: string;
    generate_audio?: boolean;
    input_video_url?: string;
    character_orientation?: "image" | "video";
  };

  fal_request_id: string | null;
  fal_endpoint: string | null;

  output_url: string | null;
  thumbnail_url: string | null;
  output_meta: Record<string, unknown> | null;

  point_cost: number;
  error_message: string | null;
  retry_count: number;

  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Payload aceito por POST /api/jobs
export interface CreateJobPayload {
  modelId: string;
  type: JobType;
  prompt?: string;
  negativePrompt?: string;
  inputImages: InputImage[];
  config: JobConfig;
}
