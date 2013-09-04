;(function( exports ) {
	
	/**
	 * Define a tree of attributes.
	 * Track subtrees where the values of the attributes have been modified
	 **/
	var ElphabaModified = function() {
		this.attributes = {};
	};
	
	/**
	 * Check whether an attribute is defined.
	 * @param {string} key Name of attribute.
	 * @param {boolean} True if defined.
	 **/
	ElphabaModified.prototype.has = function( key ) {
		return this.attributes.hasOwnProperty( key );
	};
	
	/**
	 * Retrieve the value associated with an attribute.
	 * @param {string} key Name of the attribute.
	 * @return {Object} Value of the attribute.
	 **/
	ElphabaModified.prototype.get = function( key ) {
		return this.attributes[ key ];
	};
	
	/**
	 * Assign a value to an attribute.
	 * @param {string} key Name of the attribute.
	 * @param {Object} Value of the attribute.
	 **/
	ElphabaModified.prototype.set = function( key, value ) {
		this.attributes[ key ] = value;
		return this;
	};
	
	/**
	 * Remove an attribute.
	 * @param {string} key Name of the attribute.
	 **/
	ElphabaModified.prototype.unset = function( key ) {
		delete this.attributes[ key ];
		return this;
	};
	
	/**
	 * Stub function to maintain compatibility with backbone.
	 * @private
	 **/
	ElphabaModified.prototype.trigger = function() {};
	
	/**
	 * Mark all attributes as unmodified.
	 **/
	ElphabaModified.prototype.flush = function() {
		this.__prevMods__ = this.__currMods__ || {};
		this.__currMods__ = {};
		this.trigger( "modified", this.__prevMods__ );
	};
	
	/**
	 * Return true if "key" points to any node belonging to a modified subtree.
	 * Return false otherwise.
	 * @private
	 **/
	ElphabaModified.prototype.__isModified__ = function( modified, keys, depth ) {
		if ( modified === true )
			return true;
		if ( depth === keys.length )
			return true;
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			for ( var i = 0; i < key.length; i++ )
				if ( modified.hasOwnProperty( key[i] ) )
					if ( this.__isModified__( modified[ key[i] ], keys, depth + 1 ) )
						return true;
			return false;
		}
		else if ( key === "*" ) {
			for ( var k in modified )
				if ( this.__isModified__( modified[k], keys, depth + 1 ) )
					return true;
			return false;
		}
		else {
			if ( modified.hasOwnProperty( key ) )
				if ( this.__isModified__( modified[ key ], keys, depth + 1 ) )
					return true;
			return false;
		}
	};
	ElphabaModified.prototype.isModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__currMods__" ) )
			return this.__isModified__( this.__currMods__, keys, 0 );
		else
			return false;
	};
	ElphabaModified.prototype.wasModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__prevMods__" ) )
			return this.__isModified__( this.__prevMods__, keys, 0 );
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
	ElphabaModified.prototype.__getModified__ = function( modified, keys, depth ) {
		if ( modified === true )
			return modified;
		if ( depth === keys.length )
			return _.keys( modified );
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			var results = {};
			for ( var i = 0; i < key.length; i++ )
				if ( modified.hasOwnProperty( key[i] ) )
					results[ key[i] ] = this.__getModified__( modified[ key[i] ], keys, depth + 1 );
				else
					results[ key[i] ] = undefined;
			return results;
		}
		else if ( key === "*" ) {
			var results = {};
			for ( var k in modified )
				results[ k ] = this.__getModified__( modified[ k ], keys, depth + 1 );
			return results;
		}
		else {
			if ( modified.hasOwnProperty( key ) )
				return this.__getModified__( modified[ key ], keys, depth + 1 );
			else
				return undefined;
		}
	};
	ElphabaModified.prototype.getModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__currMods__" ) )
			return this.__getModified__( this.__currMods__, keys, 0 );
		else
			return undefined;
	};
	ElphabaModified.prototype.gotModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		if ( this.hasOwnProperty( "__prevMods__" ) )
			return this.__getModified__( this.__prevMods__, keys, 0 );
		else
			return undefined;
	};

	/**
	 * Mark all nodes referenced by "key" as modified.
	 * No wildcard keys allowed.
	 * @private
	 **/
	ElphabaModified.prototype.__setModified__ = function( modified, keys, depth ) {
		if ( modified === true )
			return true;
		if ( depth === keys.length )
			return true;
		var key = keys[ depth ];
		if ( Array.isArray( key ) ) {
			for ( var i = 0; i < key.length; i++ )
				modified[ key[i] ] = this.__setModified__( modified[ key[i] ] || {}, keys, depth + 1 );
			return modified;
		}
		else if ( key === "*" ) {
			return true;
		}
		else {
			modified[ key ] = this.__setModified__( modified[ key ] || {}, keys, depth + 1 );
			return modified;
		}
	};
	ElphabaModified.prototype.setModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		this.__currMods__ = this.__setModified__( this.__currMods__ || {}, keys, 0 );
	};

	ElphabaModified.prototype.__getAttribute__ = function( attribute, keys, depth ) {
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
						results[ key[i] ] = this.__getAttribute__( attribute[ key[i] ], keys, depth + 1 );
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
					results[ k ] = this.__getAttribute__( attribute[ k ], keys, depth + 1 );
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
					return this.__getAttribute__( attribute[ key ], keys, depth + 1 );
				else
					return undefined;
		}
	};
	ElphabaModified.prototype.getAttribute = function() {
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
						results[ key[i] ] = this.__getAttribute__( this.get( key[i] ), keys, 1 );
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
					results[ k ] = this.__getAttribute__( this.get( k ), keys, 1 );
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
					return this.__getAttribute__( this.get( key ), keys, 1 );
				else
					return undefined
		}
	};
	
	ElphabaModified.prototype.__setAttribute__ = function( attribute, keys, depth, value ) {
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
						attribute[ key[i] ] = this.__setAttribute__( attribute[ key[i] ], keys, depth + 1, value[i] );
					else
						attribute[ key[i] ] = this.__setAttribute__( {}, keys, depth + 1, value[i] );
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
					attribute[ k ] = this.__setAttribute( attribute[ k ], keys, depth + 1, value );
		}
		else {
			if ( depth + 1 === keys.length )
				if ( value === undefined )
					delete attribute[ key ];
				else
					attribute[ key ] = value;
			else
				if ( attribute.hasOwnProperty( key ) )
					attribute[ key ] = this.__setAttribute__( attribute[ key ], keys, depth + 1, value );
				else
					attribute[ key ] = this.__setAttribute__( {}, keys, depth + 1, value );
		}
		return attribute;
	};
	ElphabaModified.prototype.setAttribute = function() {
		var keys = Array.prototype.slice.call( arguments );
		var value = keys.pop();
		var key = keys[ 0 ];
		if ( Array.isArray( key ) ) {
			if ( 1 === keys.length )
				for ( var i = 0; i < key.length; i++ )
					if ( value[i] === undefined )
						this.unset( key[i], { "silent" : true } );
					else
						this.set( key[i], value[i], { "silent" : true } );
			else
				for ( var i = 0; i < key.length; i++ )
					this.set( key[i], this.__setAttribute__( this.get( key[i] ) || {}, keys, 1, value[i] ), { "silent" : true } );
			this.trigger( "change " + key.map(function(d) { return "change:"+d } ).join(" ") );
		}
		else if ( key === "*" ) {
			if ( 1 === keys.length )
				for ( var k in this.attributes )
					if ( value === undefined )
						this.unset( k, { "silent" : true } );
					else
						this.set( k, value, { "silent" : true } );
			else
				for ( var k in this.attributes )
					this.set( k, this.__setAttribute__( this.get( k ) || {}, keys, 1, value ), { "silent" : true } );
			this.trigger( "change " + _.keys(this.attributes).map(function(d) { return "change:"+d } ).join(" ") );
		}
		else {
			if ( 1 === keys.length )
				if ( value === undefined )
					this.unset( key, { "silent" : true } );
				else
					this.set( key, value, { "silent" : true } );
			else
				this.set( key, this.__setAttribute__( this.get( key ) || {}, keys, 1, value ), { "silent" : true } );
			this.trigger( "change change:" + key );
		}
		return this;
	};

	ElphabaModified.prototype.setAttributeAndModified = function() {
		var keys = Array.prototype.slice.call( arguments );
		var value = keys.pop();
		ElphabaModified.prototype.setModified.apply( this, keys );
		ElphabaModified.prototype.setAttribute.apply( this, arguments );
		return this;
	};

	// Extend backbone model
	Backbone.Model.prototype.flush = ElphabaModified.prototype.flush;

	Backbone.Model.prototype.__isModified__  = ElphabaModified.prototype.__isModified__ ;
	Backbone.Model.prototype.__getModified__ = ElphabaModified.prototype.__getModified__;
	Backbone.Model.prototype.__setModified__ = ElphabaModified.prototype.__setModified__;

	Backbone.Model.prototype.isModified = ElphabaModified.prototype.isModified;
	Backbone.Model.prototype.wasModified = ElphabaModified.prototype.wasModified;
	Backbone.Model.prototype.getModified = ElphabaModified.prototype.getModified;
	Backbone.Model.prototype.gotModified = ElphabaModified.prototype.gotModified;
	Backbone.Model.prototype.setModified = ElphabaModified.prototype.setModified;

	Backbone.Model.prototype.__getAttribute__ = ElphabaModified.prototype.__getAttribute__;
	Backbone.Model.prototype.__setAttribute__ = ElphabaModified.prototype.__setAttribute__;

	Backbone.Model.prototype.getAttr = ElphabaModified.prototype.getAttribute;
	Backbone.Model.prototype.setAttr = ElphabaModified.prototype.setAttributeAndModified;

	// Export (node.js) or declare in global namespace
	if ( ! exports.hasOwnProperty( "Elphaba" ) ) {
		exports[ "Elphaba" ] = {};
	}
	exports[ "Elphaba" ].Modified = ElphabaModified;

})( typeof module === "undefined" ? this : module.exports );
