#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import json
import urllib
import urllib2

import cgi
import cgitb

def getQuery():
	form = cgi.FieldStorage()
	return form.getfirst( 'tReq' )

def makeRequest( tReq ):
	url = 'http://joan.stanford.edu:8017/t?tReq={}'.format( urllib.quote( tReq ) )
	request = urllib2.urlopen( url )
	content = request.read()
	return json.loads( content, encoding = 'ISO-8859-1' )

# Enable debugging
cgitb.enable()
query = getQuery()
response = makeRequest( query )
content = response

# Send out latest labels
print "Content-Type: text/plain;charset=utf-8"
print

print json.dumps( content, encoding = 'utf-8' )
