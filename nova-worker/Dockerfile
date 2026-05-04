FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04
RUN pip install --no-cache-dir runpod diffusers transformers accelerate pillow huggingface_hub
COPY handler.py /handler.py
CMD ["python", "-u", "/handler.py"]
