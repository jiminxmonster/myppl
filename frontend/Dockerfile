FROM node:22-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_INTERNAL_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_INTERNAL_API_URL=${NEXT_INTERNAL_API_URL}

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
