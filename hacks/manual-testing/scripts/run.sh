#!/bin/bash
set -o allexport 
. ./deploy-zeto-anon.sh
. ./deploy-zeto-anon-result.sh

. ./mint-zeto-anon.sh
. ./mint-zeto-anon-result.sh

. ./transfer-zeto-anon-a1-2-a2.sh
. ./result.sh


. ./transfer-zeto-anon-a2b.sh
. ./transfer-zeto-anon-a2b-result.sh
set +o allexport 
