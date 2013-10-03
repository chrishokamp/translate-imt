#!/usr/bin/env python

import glob
import re
import json

filenames = glob.glob( '*source*.json' )
for filename in filenames:
	m = re.search( r'^(.+)source(.+)\.json$', filename )
	if m is not None:
		docPrefix = m.group(1)
		docSuffix = m.group(2)
		outputFilename = '{}doc{}.json'.format( docPrefix, docSuffix )
		with open( filename ) as f:
			with open( outputFilename, 'w' ) as g:
				docId = filename
				segmentList = json.load( f, encoding = 'utf-8' )
				segmentIds = [ 'S{}'.format(i+1) for i in range(len(segmentList)) ]
				segments = { segmentIds[i] : segmentList[i] for i in range(len(segmentList)) }
				data = {
					'docId' : docId,
					'segmentIds' : segmentIds,
					'segments' : segments
				}
				json.dump( data, g, encoding = 'utf-8', indent = 2, sort_keys = True )
