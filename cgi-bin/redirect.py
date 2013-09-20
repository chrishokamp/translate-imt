#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import json
import urllib
import urllib2

import cgi
import cgitb

def getRequest():
	form = cgi.FieldStorage()
	req = {}
	req[ 'tReq' ] = form.getfirst( 'tReq' )
	req[ 'rqReq' ] = form.getfirst( 'rqReq' )
	return req
	
def makeRequest( req ):
	query = []
	if req[ 'tReq' ] is not None:
		query.append( 'tReq={}'.format( urllib.quote( req[ 'tReq' ] ) ) )
	if req[ 'rqReq' ] is not None:
		query.append( 'rqReq={}'.format( urllib.quote( req[ 'rqReq' ] ) ) )
	url = 'http://joan.stanford.edu:8017/t?{}'.format( '&'.join( query ) )
	request = urllib2.urlopen( url )
	content = request.read()
	return json.loads( content, encoding = 'ISO-8859-1' )

# Enable debugging
cgitb.enable()
req = getRequest()
response = makeRequest( req )
content = response

# Send out latest labels
print "Content-Type: text/plain;charset=utf-8"
print

print json.dumps( content, encoding = 'utf-8' )
