import base64
import os
import tempfile
import uuid
from pathlib import Path

import runpod

PIPE = None


def _load_model():
    global PIPE
    if PIPE is not None:
        return
    import torch
    from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
    from transformers import CLIPVisionModel

    model_id = os.environ.get("MODEL_ID", "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers")
    dtype = torch.bfloat16
    image_encoder = CLIPVisionModel.from_pretrained(
        model_id, subfolder="image_encoder", torch_dtype=dtype
    )
    vae = AutoencoderKLWan.from_pretrained(
        model_id, subfolder="vae", torch_dtype=torch.float32
    )
    PIPE = WanImageToVideoPipeline.from_pretrained(
        model_id, vae=vae, image_encoder=image_encoder, torch_dtype=dtype
    )
    PIPE.to("cuda")
    print("WAN2.1 loaded", flush=True)


def handler(job):
    inp = job.get("input", {})
    image_b64 = inp.get("image_base64", "")
    prompt = inp.get("prompt", "a person moving naturally, photorealistic")
    num_frames = max(16, min(int(inp.get("length", 81)), 120))

    if not image_b64:
        return {"error": "image_base64 required"}

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(base64.b64decode(image_b64))
        image_path = f.name

    try:
        _load_model()
        from diffusers.utils import export_to_video
        from PIL import Image

        image = Image.open(image_path).convert("RGB").resize((832, 480))
        result = PIPE(
            image=image,
            prompt=prompt,
            num_frames=num_frames,
            guidance_scale=5.0,
            num_inference_steps=30,
        )
        out_path = f"/tmp/{uuid.uuid4().hex}.mp4"
        export_to_video(result.frames[0], out_path, fps=16)
        video_b64 = base64.b64encode(Path(out_path).read_bytes()).decode()
        Path(out_path).unlink(missing_ok=True)
        return {"video_b64": video_b64, "frames": num_frames}
    except Exception as e:
        return {"error": str(e)}
    finally:
        Path(image_path).unlink(missing_ok=True)


runpod.serverless.start({"handler": handler})
