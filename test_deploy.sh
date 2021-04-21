#!/bin/bash
set -e

sudo docker build . --tag dessalines/lemmy-ui:dev
sudo docker push dessalines/lemmy-ui:dev
