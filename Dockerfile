FROM nginx:alpine

# Copy our custom Nginx config to overwrite the default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all static web content into the Nginx web root directory
COPY . /usr/share/nginx/html

# Expose port 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
