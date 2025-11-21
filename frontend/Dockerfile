FROM node:20

WORKDIR /app

# Installer les dépendances
COPY package.json package-lock.json* ./
RUN npm install

# Copier le reste du code
COPY . .

EXPOSE 5173

# Lancer le serveur de dev Vite
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
