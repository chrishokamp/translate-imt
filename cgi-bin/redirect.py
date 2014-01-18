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
	req['tReq'] = form.getfirst('tReq')
	req['rqReq'] = form.getfirst('rqReq')
	return req
	
def redirectRequest( req ):
	query = []
	if req['tReq'] is not None:
		query.append( 'tReq={}'.format( urllib.quote( req['tReq'].encode('utf-8') ) ) )
	if req['rqReq'] is not None:
		query.append( 'rqReq={}'.format( urllib.quote( req['rqReq'].encode('utf-8') ) ) )
#	url = 'http://joan.stanford.edu:8017/t?{}'.format( '&'.join( query ) )
	url = 'http://joan.stanford.edu:8017/x?{}'.format( '&'.join( query ) )
#	url = 'http://ptm.stanford.edu/x?{}'.format( '&'.join( query ) )
	request = urllib2.urlopen( url )
	content = request.read()
	return json.loads( content, encoding = 'utf-8' )

# Enable debugging
cgitb.enable()

# Get incoming HTTP request
request = getRequest()

# Redirect tReq and rqRest to joan.stanford.edu:8017/t
response = redirectRequest( request )

# Return the HTTP response
print "Content-Type: text/plain;charset=utf-8"
print "Access-Control-Allow-Origin: http://127.0.0.1:8000"
print
print json.dumps( response, encoding = 'utf-8' )
