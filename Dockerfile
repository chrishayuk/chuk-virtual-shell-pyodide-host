# Start from an official Node.js base image (adjust version as desired)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for efficient Docker caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your project files into the container
COPY . .

# Expose a port if your shell or app listens on a specific port
# (not strictly necessary if your shell doesn't listen on a port)
# EXPOSE 8080

# Default command: run the Pyodide shell with optional arguments
# (You can override or add additional flags, e.g. --python-path, at runtime)
CMD ["npm", "start", "--", "--python-path", "/app/chuk_virtual_shell"]