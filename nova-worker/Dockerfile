FROM runpod/pytorch:1.0.3-cu1281-torch290-ubuntu2204
RUN pip install --no-cache-dir runpod diffusers transformers accelerate pillow huggingface_hub
COPY handler.py /handler.py
CMD ["python", "-u", "/handler.py"]
