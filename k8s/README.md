# To deploy CORTEX on Kubernetes:
#
# 1. Set your API key:
#    kubectl create secret generic cortex-secrets \
#      --from-literal=openai_api_key=sk-or-v1-your-key-here
#
# 2. Deploy:
#    kubectl apply -f k8s/deployment.yaml
#
# 3. Run a one-off task:
#    kubectl run cortex-task --rm -it --image=ghcr.io/gokul77898/cortex:latest --restart=Never -- "refactor this code"
