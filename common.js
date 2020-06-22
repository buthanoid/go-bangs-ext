// constants for the column in the bangs data
const BANG = 0, LABEL = 1, URL_WITHOUT_PARAM = 2, URL_BEFORE_PARAM = 3, URL_AFTER_PARAM = 4 ;

const LABELS = ["bang", "label", "URL without param", "URL before param", "URL after param"]

// constants for errors
const E_MISSING_KEYS = 0, E_NOT_OBJECT = 1, E_CANNOT_LOAD = 2, E_BAD_JSON = 3, E_NULL = 4 ;

const storage = browser.storage.local ;

// array[string] -> promise[object]
function storage_get_all_keys (keys) {
	return storage.get(keys)
		.then(res => {
			if (typeof res !== "object") throw {
				value: E_NOT_OBJECT,
				msg: "result is not an object", 
				ctxt: "trying to query storage with keys " + keys } ;
			if (res === null) throw {
				value: E_NULL,
				msg: "result is null",
				ctxt: "trying to query storage with keys " + keys } ;
			var missing_keys = [] ;
			keys.forEach(key => {
				if (! res.hasOwnProperty(key)) missing_keys.push(key) ;
			});
			if (missing_keys.length == 0) return res ;
			else throw { 
				value: E_MISSING_KEYS,
				msg: "missing some keys", 
				missing_keys: missing_keys } ;
		});
}

// string -> promise[object]
function storage_get_key (key) {
	return storage_get_all_keys([key]).then(res => res[key]) ;
}

// string, string -> promise[object]
function xhr_get_json (url) {
	return new Promise((onSuccess, onError) => {
		var request = new XMLHttpRequest();
		request.open("GET", url);
		request.responseType = "json" ;
		request.onload = (() => { onSuccess(request.response) });
		request.onerror = (() => { onError({
			value: E_CANNOT_LOAD,
			msg: "xhr could not load file",
			file_url: url,
			xhr_request: request })
		});
		request.send () ;
	}).then (res => {
		if (res == null) throw { 
			value: E_BAD_JSON,
			ctxt: "trying to get JSON from url " + url } ;
		else return res ;
	});
}