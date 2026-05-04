import json
import os
import traceback
import uuid
from pathlib import Path

import runpod
from runpod.serverless.modules.rp_logger import RunPodLogger

log = RunPodLogger()

MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
VALID_FRAMES = [i for i in range(1, 82) if (i - 1) % 4 == 0]
PIPE = None


def _snap_frames(n):
    return min(VALID_FRAMES, key=lambda x: abs(x - n))


def _load_model():
    global PIPE
    if PIPE is not None:
        return
    import torch
    from diffusers import WanPipeline

    log.info(f"Loading {MODEL_ID}")
    PIPE = WanPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
    PIPE.to("cuda")
    log.info("Model ready")


def handler(event):
    job_input = event["input"]
    log.info(f"job started: {list(job_input.keys())}")

    prompt = job_input.get("prompt", "A professional woman speaking naturally, photorealistic, studio lighting")
    num_frames = _snap_frames(max(5, min(int(job_input.get("num_frames", 17)), 81)))

    out_path = f"/tmp/{uuid.uuid4().hex}.mp4"

    try:
        _load_model()
        from diffusers.utils import export_to_video

        result = PIPE(
            prompt=prompt,
            num_frames=num_frames,
            guidance_scale=5.0,
            num_inference_steps=20,
        )
        export_to_video(result.frames[0], out_path, fps=16)
        import base64
        video_b64 = base64.b64encode(Path(out_path).read_bytes()).decode()
        return {"video_b64": video_b64, "frames": num_frames, "fps": 16}

    except Exception as e:
        log.error(traceback.format_exc())
        return {"error": str(e)}
    finally:
        Path(out_path).unlink(missing_ok=True)


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
