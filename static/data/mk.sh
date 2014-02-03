#!/usr/bin/env bash

# NOTE: This requires the latest CoreNLP jars
# in your classpath. For example, you can run this
# on the NLP cluster, which configures the classpath
# automatically.

for file in $(ls *.txt); do
    java -server -Xmx6g -Xms6g edu.stanford.nlp.mt.service.tools.CoreNLPToJSON $file > $file.json
done
