#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import argparse
import json
import urllib
import urllib2

T_REQ = {
	'src' : 'EN',
	'tgt' : 'DE',
	"n" : 10,
	"text" : 'With Europe sputtering and China costly, the "stars are aligning" for Mexico as broad changes in the global economy create new dynamics of migration.',
	"tgtPrefix" : ''
}
RQ_REQ = {
	'src' : 'EN',
	'tgt' : 'DE',
	'spanLimit' : 10,
	'text' : 'Great Britain'
}

def getTranslateRequest():
	request = {}
	request['tReq'] = json.dumps( T_REQ, encoding = 'utf-8' )
	return request

def getRuleQueryRequest():
	request = {}
	request['rqReq'] = json.dumps( RQ_REQ, encoding = 'utf-8' )
	return request

def redirectRequest( request ):
	query = []
	if 'tReq' in request and request['tReq'] is not None:
		query.append( 'tReq={}'.format( urllib.quote( request['tReq'] ) ) )
	if 'rqReq' in request and request['rqReq'] is not None:
		query.append( 'rqReq={}'.format( urllib.quote( request['rqReq'] ) ) )
#	url = 'http://joan.stanford.edu:8017/t?{}'.format( '&'.join( query ) )
#	url = 'http://joan.stanford.edu:8017/x?{}'.format( '&'.join( query ) )
	url = 'http://ptm.stanford.edu/x?{}'.format( '&'.join( query ) )
	print 'URL = {}'.format( url )
	request = urllib2.urlopen( url )
	content = request.read()
	print 'RESPONSE = {}'.format( content )
	return json.loads( content, encoding = 'ISO-8859-1' )
	
parser = argparse.ArgumentParser( description = 'Test script for translate server on joan.stanford.edu' )
parser.add_argument( '-t', '--translate' , dest = 'translate', action = 'store_true', help = 'Translate (tReq)'  )
parser.add_argument( '-r', '--rule-query', dest = 'ruleQuery', action = 'store_true', help = 'Rule Query (rqReq)' )
args = parser.parse_args()
checkTranslate = args.translate
checkRuleQuery = args.ruleQuery
numTests = 0
	
if checkTranslate:
	numTests += 1
	print 'Testing tReq queries...'
	query = getTranslateRequest()
	response = redirectRequest( query )
	print json.dumps( response, encoding = 'utf-8', indent = 2 )

if checkRuleQuery:
	numTests += 1
	print 'Testing rqReq queries...'
	query = getRuleQueryRequest()
	response = redirectRequest( query )
	print json.dumps( response, encoding = 'utf-8', indent = 2 )

print 'Number of tests performed = {}'.format( numTests )
