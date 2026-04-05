FROM node:20-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json ./
RUN npm install

# Copy application logic
COPY . .

# Expose Vite Port
EXPOSE 5173

# Run the dev server bound to network interface
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
