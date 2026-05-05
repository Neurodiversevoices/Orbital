FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends     python3 python3-pip python3-dev     && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Torch via PyTorch index
RUN pip install --no-cache-dir     torch==2.1.0+cu121 torchvision==0.16.0+cu121     --index-url https://download.pytorch.org/whl/cu121

# Rest of deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY handler.py .

CMD ["python", "-u", "handler.py"]
