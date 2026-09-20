FROM python:3.12-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY server.py .
EXPOSE 8120
CMD ["python3", "server.py"]
