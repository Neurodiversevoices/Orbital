import base64
import traceback
import uuid
from pathlib import Path

import runpod
from runpod.serverless.modules.rp_logger import RunPodLogger

log = RunPodLogger()

MODEL_PATH = "/model"

# Valid WAN temporal VAE frame counts: (n-1) % 4 == 0
VALID_FRAMES = [i for i in range(1, 82) if (i - 1) % 4 == 0]


def _snap_frames(n):
    return min(VALID_FRAMES, key=lambda x: abs(x - n))


# Module-level init — runs ONCE at worker boot, not per request
import torch
from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
from transformers import CLIPVisionModel

log.info(f"Loading WAN2.1 I2V 1.3B from {MODEL_PATH}")
image_encoder = CLIPVisionModel.from_pretrained(
    MODEL_PATH, subfolder="image_encoder", torch_dtype=torch.float32
)
vae = AutoencoderKLWan.from_pretrained(
    MODEL_PATH, subfolder="vae", torch_dtype=torch.float32
)
PIPE = WanImageToVideoPipeline.from_pretrained(
    MODEL_PATH, vae=vae, image_encoder=image_encoder, torch_dtype=torch.bfloat16
)
PIPE.to("cuda")
log.info("Model ready")


@runpod.serverless.register_fitness_check
def gpu_available():
    assert torch.cuda.is_available(), "CUDA not available"


def handler(event):
    job_input = event["input"]
    log.info(f"job started: {list(job_input.keys())}")

    image_b64 = job_input.get("image_base64", "")
    prompt = job_input.get("prompt", "a person moving naturally, photorealistic")
    num_frames = _snap_frames(max(5, min(int(job_input.get("num_frames", 17)), 81)))

    if not image_b64:
        return {"error": "image_base64 required"}

    image_path = f"/tmp/{uuid.uuid4().hex}.png"
    out_path = f"/tmp/{uuid.uuid4().hex}.mp4"

    try:
        Path(image_path).write_bytes(base64.b64decode(image_b64))

        from diffusers.utils import export_to_video
        from PIL import Image

        image = Image.open(image_path).convert("RGB").resize((832, 480))
        result = PIPE(
            image=image,
            prompt=prompt,
            num_frames=num_frames,
            guidance_scale=5.0,
            num_inference_steps=20,
        )
        export_to_video(result.frames[0], out_path, fps=16)
        video_b64 = base64.b64encode(Path(out_path).read_bytes()).decode()
        return {"video_b64": video_b64, "frames": num_frames, "fps": 16}

    except Exception as e:
        log.error(traceback.format_exc())
        return {"error": str(e)}
    finally:
        Path(image_path).unlink(missing_ok=True)
        Path(out_path).unlink(missing_ok=True)


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
