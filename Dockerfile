FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# System deps
RUN apt-get update && apt-get install -y python3.11 python3-pip python3.11-dev     && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt     --extra-index-url https://download.pytorch.org/whl/cu121

# Bake model weights (3.5 GB — under 10 GB bake-in threshold)
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('Wan-AI/Wan2.1-I2V-1.3B-480P-Diffusers', local_dir='/model', ignore_patterns=['*.gguf'])"

COPY handler.py .

CMD ["python", "-u", "handler.py"]
