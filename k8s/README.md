# Dayf Booking Kubernetes deployment

## Prerequisites

- Kubernetes cluster with an NGINX Ingress Controller.
- Metrics Server for the HPA.
- A `dayf-booking-tls` TLS secret, or a certificate controller that creates it.
- The backend image pushed to the registry in `deployment.yaml`.
- A CNI plugin with NetworkPolicy support is recommended.

## Deploy

```bash
kubectl apply -f k8s/namespace.yaml
kubectl -n dayf-booking create secret generic dayf-backend-secret \
  --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k k8s
kubectl -n dayf-booking rollout status deployment/dayf-backend
```

The ConfigMap overrides container-specific values such as ports and the Redis
service hostname. Keep credentials only in the Secret.

## Verify

```bash
kubectl -n dayf-booking get pods,svc,ingress,hpa,pvc
kubectl -n dayf-booking logs deployment/dayf-backend -f
kubectl -n dayf-booking port-forward service/dayf-backend 8000:80
```

After port-forwarding, open `http://localhost:8000`.

Socket.IO uses the Redis adapter and ingress cookie affinity, so broadcasts and
long-polling handshakes continue to work when the HPA runs multiple backend pods.

## TLS

If TLS is managed manually:

```bash
kubectl -n dayf-booking create secret tls dayf-booking-tls \
  --cert=fullchain.pem --key=privkey.pem
```

Do not commit generated Secret manifests or production `.env` files.
