FROM aiorbust/wan2.1-steadydancer:latest
ENTRYPOINT []
RUN pip install --no-cache-dir runpod
COPY handler.py /handler.py
CMD ["python", "-u", "/handler.py"]
