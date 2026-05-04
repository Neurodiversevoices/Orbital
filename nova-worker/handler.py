import base64
import os
import tempfile
import traceback
import uuid
from pathlib import Path

import runpod

MODEL_ID = "Wan-AI/Wan2.1-I2V-1.3B-480P-Diffusers"
PIPE = None

# Valid frame counts: (n-1) % 4 == 0
VALID_FRAMES = [i for i in range(1, 82) if (i - 1) % 4 == 0]


def _snap_frames(n):
    return min(VALID_FRAMES, key=lambda x: abs(x - n))


def _load_model():
    global PIPE
    if PIPE is not None:
        return
    import torch
    from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
    from transformers import CLIPVisionModel

    print(f"Loading {MODEL_ID}", flush=True)
    image_encoder = CLIPVisionModel.from_pretrained(
        MODEL_ID, subfolder="image_encoder", torch_dtype=torch.float32
    )
    vae = AutoencoderKLWan.from_pretrained(
        MODEL_ID, subfolder="vae", torch_dtype=torch.float32
    )
    PIPE = WanImageToVideoPipeline.from_pretrained(
        MODEL_ID, vae=vae, image_encoder=image_encoder, torch_dtype=torch.bfloat16
    )
    PIPE.to("cuda")
    print("Model loaded", flush=True)


def handler(job):
    inp = job.get("input", {})
    image_b64 = inp.get("image_base64", "")
    prompt = inp.get("prompt", "a person moving naturally, photorealistic")
    requested_frames = int(inp.get("length", 49))
    num_frames = _snap_frames(max(5, min(requested_frames, 81)))

    if not image_b64:
        return {"error": "image_base64 required"}

    image_bytes = base64.b64decode(image_b64)
    image_path = f"/tmp/{uuid.uuid4().hex}_input.png"
    out_path = f"/tmp/{uuid.uuid4().hex}_output.mp4"

    try:
        Path(image_path).write_bytes(image_bytes)
        _load_model()

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

        # Upload via RunPod managed storage to avoid 10MB response limit
        try:
            from runpod.serverless.modules.rp_upload import upload_file_to_bucket
            video_url = upload_file_to_bucket(out_path, f"nova/{uuid.uuid4().hex}.mp4")
            return {"video_url": video_url, "frames": num_frames}
        except Exception:
            # Fallback: return base64 (works for small outputs)
            video_b64 = base64.b64encode(Path(out_path).read_bytes()).decode()
            return {"video_b64": video_b64, "frames": num_frames}

    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return {"error": str(e)}
    finally:
        Path(image_path).unlink(missing_ok=True)
        Path(out_path).unlink(missing_ok=True)


runpod.serverless.start({"handler": handler})
