;(function( exports ) {
	
	/**
	 * Define a tree of attributes.
	 * Track subtrees where the values of the attributes have been modified
	 **/
	var ElphabaModel = function() {
		this.attributes = {};
	};
	
	/**
	 * Check whether an attribute is defined.
	 * @param {string} key Name of attribute.
	 * @param {boolean} True if defined.
	 **/
	ElphabaModel.prototype.has = function( key ) {
		return this.attributes.hasOwnProperty( key );
	};
	
	/**
	 * Retrieve the value associated with an attribute.
	 * @param {string} key Name of the attribute.
	 * @return {Object} Value of the attribute.
	 **/
	ElphabaModel.prototype.get = function( key ) {
		return this.attributes[ key ];
	};
	
	/**
	 * Assign a value to an attribute.
	 * @param {string} key Name of the attribute.
	 * @param {Object} Value of the attribute.
	 **/
	ElphabaModel.prototype.set = function( key, value ) {
		this.attributes[ key ] = value;
		return this;
	};
	
	/**
	 * Remove an attribute.
	 * @param {string} key Name of the attribute.
	 **/
	ElphabaModel.prototype.unset = function( key ) {
		delete this.attributes[ key ];
		return this;
	};
	
	/**
	 * Stub function to maintain compatibility with backbone.
	 * @private
	 **/
	ElphabaModel.prototype.trigger = function() {};
	
	/**
	 * Trigger a "modified" event and subsequently reset all attributes as un-modified.
	 **/
	ElphabaModel.prototype.flush = function() {
		this.__previousModified__ = this.__modified__ || {};
		this.__modified__ = {};
		this.trigger( "modified", this.__previousModified__ );
	};
	
	/**
	 * Return true if "key" points to any node belonging to a modified subtree.
	 * Return false otherwise.
	 **/
	var __isModified__ = function( modified, keys, depth ) {
		if ( modified === true )
			return true;
		if ( depth === keys.length )
			return true;
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			for ( var i = 0; i < key.length; i++ )
				if ( modified.hasOwnProperty( key[i] ) )
					if ( __isModified__( modified[ key[i] ], keys, depth + 1 ) )
						return true;
			return false;
		}
		else if ( key === "*" ) {
			for ( var k in modified )
				if ( __isModified__( modified[k], keys, depth + 1 ) )
					return true;
			return false;
		}
		else {
			if ( modified.hasOwnProperty( key ) )
				if ( __isModified__( modified[ key ], keys, depth + 1 ) )
					return true;
			return false;
		}
	};
	ElphabaModel.prototype.isModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__modified__" ) )
			return __isModified__( this.__modified__, keys, 0 );
		else
			return false;
	};
	ElphabaModel.prototype.wasModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__previousModified__" ) )
			return __isModified__( this.__previousModified__, keys, 0 );
		else
			return false;
	};

	/**
	 * Return true if "key" points to a node beloning to the interior of a modified subtree (i.e., all indexes are considered modified).
	 * Return a list of modified indexes if "key" points to the root of a modified subtree.
	 * Return undefined if "key" points to an unmodified node.
	 * If multiple keys are defined or if a wildcard key is defined, return values are wrapped inside a hash object.
	 * @private
	 **/
	var __getModified__ = function( modified, keys, depth ) {
		if ( modified === true )
			return modified;
		if ( depth === keys.length )
			return _.keys( modified );
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			var results = {};
			for ( var i = 0; i < key.length; i++ )
				if ( modified.hasOwnProperty( key[i] ) )
					results[ key[i] ] = __getModified__( modified[ key[i] ], keys, depth + 1 );
				else
					results[ key[i] ] = undefined;
			return results;
		}
		else if ( key === "*" ) {
			var results = {};
			for ( var k in modified )
				results[ k ] = __getModified__( modified[ k ], keys, depth + 1 );
			return results;
		}
		else {
			if ( modified.hasOwnProperty( key ) )
				return __getModified__( modified[ key ], keys, depth + 1 );
			else
				return undefined;
		}
	};
	ElphabaModel.prototype.getModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__modified__" ) )
			return __getModified__( this.__modified__, keys, 0 );
		else
			return undefined;
	};
	ElphabaModel.prototype.gotModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__previousModified__" ) )
			return __getModified__( this.__previousModified__, keys, 0 );
		else
			return undefined;
	};

	/**
	 * Mark all nodes referenced by "key" as modified.
	 * No wildcard keys allowed.
	 * @private
	 **/
	var __setModified__ = function( modified, keys, depth ) {
		if ( modified === true )
			return true;
		if ( depth === keys.length )
			return true;
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			for ( var i = 0; i < key.length; i++ )
				modified[ key[i] ] = __setModified__( modified[ key[i] ] || {}, keys, depth + 1 );
			return modified;
		}
		else if ( key === "*" ) {
			return true;
		}
		else {
			modified[ key ] = __setModified__( modified[ key ] || {}, keys, depth + 1 );
			return modified;
		}
	};
	ElphabaModel.prototype.setModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		this.__modified__ = __setModified__( this.__modified__ || {}, keys, 0 );
	};

	var __getAttribute__ = function( attribute, keys, depth ) {
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			var results = {};
			if ( depth + 1 === keys.length )
				for ( var i = 0; i < key.length; i++ )
					if ( attribute.hasOwnProperty( key[i] ) )
						results[ key[i] ] = attribute[ key[i] ];
					else
						results[ key[i] ] = undefined;
			else
				for ( var i = 0; i < key.length; i++ )
					if ( attribute.hasOwnProperty( key[i] ) )
						results[ key[i] ] = __getAttribute__( attribute[ key[i] ], keys, depth + 1 );
					else
						results[ key[i] ] = undefined;
			return results;
		}
		else if ( key === "*" ) {
			var results = {};
			if ( depth + 1 === keys.length )
				for ( var k in attribute )
					results[ k ] = attribute[ k ];
			else
				for ( var k in attribute )
					results[ k ] = __getAttribute__( attribute[ k ], keys, depth + 1 );
			return results;
		}
		else {
			if ( depth + 1 === keys.length )
				if ( attribute.hasOwnProperty( key ) )
					return attribute[ key ];
				else
					return undefined;
			else
				if ( attribute.hasOwnProperty( key ) )
					return __getAttribute__( attribute[ key ], keys, depth + 1 );
				else
					return undefined;
		}
	};
	ElphabaModel.prototype.getAttribute = function() {
		var keys = Array.prototype.slice.call( arguments );
		var key = keys[ 0 ];
		if ( Array.isArray( key ) ) {
			var results = {};
			if ( 1 === keys.length )
				for ( var i = 0; i < key.length; i++ )
					if ( this.has( key[i] ) )
						results[ key[i] ] = this.get( key[i] );
					else
						results[ key[i] ] = undefined;
			else
				for ( var i = 0; i < key.length; i++ )
					if ( this.has( key[i] ) )
						results[ key[i] ] = __getAttribute__( this.get( key[i] ), keys, 1 );
					else
						results[ key[i] ] = undefined;
			return results;
		}
		else if ( key === "*" ) {
			var results = {};
			if ( 1 === keys.length )
				for ( var k in this.attributes )
					results[ k ] = this.get( k );
			else
				for ( var k in this.attributes )
					results[ k ] = __getAttribute__( this.get( k ), keys, 1 );
			return results;
		}
		else {
			if ( 1 === keys.length )
				if ( this.has( key ) )
					return this.get( key );
				else
					return undefined;
			else
				if ( this.has( key ) )
					return __getAttribute__( this.get( key ), keys, 1 );
				else
					return undefined
		}
	};
	
	var __setAttribute__ = function( attribute, keys, depth, value ) {
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			if ( depth + 1 === keys.length )
				for ( var i = 0; i < key.length; i++ )
					if ( value[i] === undefined )
						delete attribute[ key[i] ];
					else
						attribute[ key[i] ] = value[i];
			else
				for ( var i = 0; i < key.length; i++ )
					if ( attribute.hasOwnProperty( key[i] ) )
						attribute[ key[i] ] = __setAttribute____( attribute[ key[i] ], keys, depth + 1, value[i] );
					else
						attribute[ key[i] ] = __setAttribute____( {}, keys, depth + 1, value[i] );
		}
		else if ( key === "*" ) {
			if ( depth + 1 == keys.length )
				for ( var k in attribute )
					if ( value === undefined )
						delete attribute[ k ];
					else
						attribute[ k ] = value;
			else
				for ( var k in attribute )
					attribute[ k ] = __setAttribute____( attribute[ k ], keys, depth + 1, value );
		}
		else {
			if ( depth + 1 === keys.length )
				if ( value === undefined )
					delete attribute[ key ];
				else
					attribute[ key ] = value;
			else
				if ( attribute.hasOwnProperty( key ) )
					attribute[ key ] = __setAttribute____( attribute[ key ], keys, depth + 1, value );
				else
					attribute[ key ] = __setAttribute____( {}, keys, depth + 1, value );
		}
		return attribute;
	};
	ElphabaModel.prototype.setAttribute = function() {
		var keys = Array.prototype.slice.call( arguments );
		var value = keys.pop();
		var key = keys[ 0 ];
		if ( Array.isArray( key ) ) {
			if ( 1 === keys.length )
				for ( var i = 0; i < key.length; i++ )
					if ( value[i] === undefined )
						this.unset( key[i], { "silent" : true } );          // Compatible with backbone models
					else
						this.set( key[i], value[i], { "silent" : true } );  // Compatible with backbone models
			else
				for ( var i = 0; i < key.length; i++ )
					this.set( key[i], __setAttribute____( this.get( key[i] ) || {}, keys, 1, value[i] ), { "silent" : true } );  // Compatible with backbone models
			this.trigger( "change " + key.map(function(d) { return "change:"+d } ).join(" ") );                                  // Compatible with backbone models
		}
		else if ( key === "*" ) {
			if ( 1 === keys.length )
				for ( var k in this.attributes )
					if ( value === undefined )
						this.unset( k, { "silent" : true } );       // Compatible with backbone models
					else
						this.set( k, value, { "silent" : true } );  // Compatible with backbone models
			else
				for ( var k in this.attributes )
					this.set( k, __setAttribute____( this.get( k ) || {}, keys, 1, value ), { "silent" : true } );   // Compatible with backbone models
			this.trigger( "change " + _.keys(this.attributes).map(function(d) { return "change:"+d } ).join(" ") );  // Compatible with backbone models
		}
		else {
			if ( 1 === keys.length )
				if ( value === undefined )
					this.unset( key, { "silent" : true } );        // Compatible with backbone models
				else
					this.set( key, value, { "silent" : true } );   // Compatible with backbone models
			else
				this.set( key, __setAttribute____( this.get( key ) || {}, keys, 1, value ), { "silent" : true } );  // Compatible with backbone models
			this.trigger( "change change:" + key );                                                                 // Compatible with backbone models
		}
		return this;
	};

	ElphabaModel.prototype.setAttributeAndModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		var value = keys.pop();
		ElphabaModel.prototype.setModified.apply( this, keys );
		ElphabaModel.prototype.setAttribute.apply( this, arguments );
		return this;
	};

	// Extend backbone model
	Backbone.Model.prototype.flush = ElphabaModel.prototype.flush;

	Backbone.Model.prototype.isModified = ElphabaModel.prototype.isModified;
	Backbone.Model.prototype.wasModified = ElphabaModel.prototype.wasModified;
	Backbone.Model.prototype.getModified = ElphabaModel.prototype.getModified;
	Backbone.Model.prototype.gotModified = ElphabaModel.prototype.gotModified;
	Backbone.Model.prototype.setModified = ElphabaModel.prototype.setModified;

	Backbone.Model.prototype.getAttr = ElphabaModel.prototype.getAttribute;
	Backbone.Model.prototype.setAttr = ElphabaModel.prototype.setAttributeAndModified;

	// Export (node.js) or declare in global namespace (browser)
	if ( ! exports.hasOwnProperty( "Elphaba" ) ) {
		exports[ "Elphaba" ] = {};
	}
	exports[ "Elphaba" ].Model = ElphabaModel;

})( typeof module === "undefined" ? this : module.exports );
