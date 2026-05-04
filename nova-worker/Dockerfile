FROM aiorbust/wan2.1-steadydancer:latest
RUN pip install --no-cache-dir runpod diffusers transformers accelerate pillow
COPY handler.py /handler.py
CMD ["python", "-u", "/handler.py"]
