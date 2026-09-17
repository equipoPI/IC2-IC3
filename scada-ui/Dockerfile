<<<<<<< HEAD
FROM node:18-alpine
=======
FROM node:20-alpine
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]