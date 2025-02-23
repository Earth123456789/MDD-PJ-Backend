# Use the official Traefik image
FROM traefik:v2.5

# Copy custom static configuration (if exists)
COPY ./traefik.yml /etc/traefik/traefik.yml

# Copy the custom routing file (route.yml) into the container
COPY ./route.yml /etc/traefik/route.yml

# Expose necessary ports
EXPOSE 80 8080

# Set the default command to run Traefik
CMD ["--api.insecure=true", "--providers.docker=true", "--entrypoints.web.address=:80", "--providers.file.filename=/etc/traefik/route.yml"]
