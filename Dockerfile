FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends     python3 python3-pip python3-dev     && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt     --extra-index-url https://download.pytorch.org/whl/cu121

# HF_TOKEN passed as build arg from RunPod console (never hardcoded)
ARG HF_TOKEN
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download("Wan-AI/Wan2.1-I2V-1.3B-480P-Diffusers", local_dir="/model", token="", ignore_patterns=["*.gguf"])"

COPY handler.py .

CMD ["python", "-u", "handler.py"]
