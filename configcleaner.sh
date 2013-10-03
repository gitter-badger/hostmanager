#!/bin/bash

declare -A TERMINATED_INSTANCES
ec2-describe-instances | sed '/INSTANCE/!d' | awk -F "\t" '{print $2,$6}' | while read x; do
	IFS=' ' read -a array <<< "$x"
	if [ "${array[1]}" == "stopped" ]
	then
		key="${array[0]}"
		echo "$key,${array[1]}"
		TERMINATED_INSTANCES[$key]="x"
		echo "$key >> ${TERMINATED_INSTANCES[1]}"
	fi
done
for (( i = 0; i < ${#TERMINATED_INSTANCES[*]}; i += 2 )); do
	key=${TERMINATED_INSTANCES[i]}
	value=${TERMINATED_INSTANCES[i+1]}
	echo "Key: $key"
	echo "Value: $value"
done
