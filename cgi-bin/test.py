#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import json
import urllib
import urllib2

RQ_REQ = {
	'src' : 'EN',
	'tgt' : 'DE',
	'spanLimit' : 10,
	'text' : 'Great Britain'
}
T_REQ = {
	'src' : 'EN',
	'tgt' : 'DE',
	"n" : 10,
	"text" : 'With Europe sputtering and China costly, the "stars are aligning" for Mexico as broad changes in the global economy create new dynamics of migration.',
	"tgtPrefix" : ''
};

def getTranslateRequest():
	req = {}
	req['tReq'] = json.dumps( T_REQ, encoding = 'utf-8' )
	req['rqReq'] = None
	return req

def getRuleQueryRequest():
	req = {}
	req['tReq'] = None
	req['rqReq'] = json.dumps( RQ_REQ, encoding = 'utf-8' )
	return req

def redirectRequest( req ):
	query = []
	if req['tReq'] is not None:
		query.append( 'tReq={}'.format( urllib.quote( req['tReq'] ) ) )
	if req['rqReq'] is not None:
		query.append( 'rqReq={}'.format( urllib.quote( req['rqReq'] ) ) )
	url = 'http://joan.stanford.edu:8017/t?{}'.format( '&'.join( query ) )
	request = urllib2.urlopen( url )
	content = request.read()
	return json.loads( content, encoding = 'ISO-8859-1' )

query = getTranslateRequest()
response = redirectRequest( query )
print json.dumps( response, encoding = 'utf-8', indent = 2 )

query = getRuleQueryRequest()
response = redirectRequest( query )
print json.dumps( response, encoding = 'utf-8', indent = 2 )
