#!/bin/bash

launch_browser() {
	OS=${OSTYPE//[0-9.]/}
	if [ "$OS" == "darwin" ]
	then
		sleep 2
		echo
		echo "Opening http://localhost:8888 in Google Chrome..."
		echo
		open -a Google\ Chrome "http://localhost:8888/client_src/index.html"
	else
		echo "TranslateUI is now available at http://localhost:8888"
	fi
}

launch_localhost() {
	echo
	echo "Starting a python CGIHTTPServer at port 8888..."
	echo "Press Ctrl+C to close this python web server."
	echo
	python -m CGIHTTPServer 8888
}

launch_browser &
launch_localhost
