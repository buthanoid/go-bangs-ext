// the script address the "Actions" part of the UI,
// and is also responsible for displaying the bangs list.
// The Actions part is separated in two sub parts : Actions and Sub_Actions
// Actions is where are located the main buttons,
// these one are persistent, the user can always click on them.
// Generally an action needs several steps, for example a confirmation step,
// or the user needs to fill some informations in inputs texts.
// All additional steps go into the Sub_Actions part, which is located 
// below the Actions part, separated by a hr tag.
// The Sub_Actions content is ephemeral :
// generally when a new step begin the previous content is erased.
// No actions are concurrent. There is always only one step at a time.
// The state is not registered inside a variable : 
// it consists of the content of Sub_Actions.


// We wait for the html page to be fully loaded.
// We check that the storage has been initiated, and
// if it is not the case, we do not address it here, it should have been done in "main_background.js".
document.addEventListener ("DOMContentLoaded", () => {
	storage_get_key("init")
	.then(res => start());
});

// dom elements often used
var dom_actions, dom_sub_actions, dom_err_msgs,
	dom_bangs, dom_modified ;

// () -> promise[()]
function start () {
	
	// get the dom elements often used
	dom_actions = document.querySelector("#actions");
	dom_sub_actions = document.querySelector("#sub_actions");
	dom_err_msgs = document.querySelector("#err_msgs");
	dom_bangs = document.querySelector("#bangs");
	dom_modified = document.querySelector("#modified");
	
	storage_get_all_keys(["bangs", "modified"])
	.then(res => {
		redraw_bangs(res.bangs);
		if (res.modified) dom_modified.textContent = "yes" ;
		else dom_modified.textContent = "no" ;
		// start the listeners on the main action buttons
		dom_actions.querySelector("#reset").addEventListener("click", reset_state_1);
		dom_actions.querySelector("#new").addEventListener("click", new_state_1);
		dom_actions.querySelector("#modify").addEventListener("click", mod_state_1);
		dom_actions.querySelector("#delete").addEventListener("click", del_state_1);
	});
}

// One action can necessitate several steps.
// The user clicks on a button to go to another step, this creates an event that will trigger a handler
// If the user clicks very fast, several events are sent before the handler is triggered
// But in this UI it is easy to cancel an action at any step.
// HOWEVER, cancel an action before it has reached a step, 
// for example before a handler has fully completed, is not OK.
// Indeed, some handlers use asynchronous calls (to storage for example),
// so they "return" but they are not truly "completed".
// I prefer avoid aving multiple "uncompleted" handlers at the same time,
// because it keeps things simple.
// So every handler, before doing an asynchronous call, puts the variable "stable" to false,
// and eventually puts it back to "true" when the call completes.
// Also, every handler cancel its triggering if "stable" is "false".
// Note that normally handlers are fast, unless there is a problem with the calls.
// Note that cancelling trigerring does not freeze the script as synchronous calls would, 
// so it is better because browsers do not like frozen scripts
var stable = true ;

// Now come the handlers.
// Note that every "first step" cleans Sub_Actions and Err_Msgs,
// This is the way of "cancelling" previous uncompleted actions.
// It is fine since all actions makes real storage updates only at the final step.
// When the user clicks on a button it triggers an action step.
// If the action step needs an action from the user it will put inputs and buttons in Sub_Actions
// Else, the action step just execute its scripts and nothing is displayed in Sub_Actions
// Note that the handlers that use asynchronous calls are marked with "promise" in their type comment

// cleans Sub_Actions and Err_Msgs
// () -> ()
function cancel () {
	if (! stable) { alert("processing, please wait...") ; return }
	dom_sub_actions.textContent = "" ;
	dom_err_msgs.textContent = "";
}

// Ask for confirmation for reset bangs to default
// () -> ()
function reset_state_1 () {
	if (! stable) { alert("processing, please wait...") ; return }
	dom_sub_actions.textContent = "";
	dom_err_msgs.textContent = "";
	dom_sub_actions.appendChild(create_dom_button("confirm reset all to default bangs", reset_state_2));
	dom_sub_actions.appendChild(create_dom_button("cancel", cancel));
}

// effectively reset bangs to default and cleans Sub_Action
// () -> promise[()] 
function reset_state_2 () {
	if (! stable) { alert("processing, please wait...") ; return }
	dom_sub_actions.textContent = "reset all to default bangs processing, please wait...";
	stable = false ;
	xhr_get_json("default_bangs.json")
	.then(default_bangs => {
		storage.set({ bangs: default_bangs.sort(), modified: false })
		.then(() => {
			dom_modified.textContent = "no" ;
			redraw_bangs(default_bangs)
		});
	})
	.finally(() => {
		stable = true ;
		dom_sub_actions.textContent = "success reset all to default bangs";
	});
}

// Creates the inputs for a new bang
// () -> ()
function new_state_1 () {
	if (! stable) { alert("processing, please wait...") ; return }
	dom_sub_actions.textContent = ""; 
	dom_err_msgs.textContent = "";
		
	LABELS.forEach(label => {
		dom_sub_actions.appendChild(create_dom_span(label + " ")) ;
		dom_sub_actions.appendChild(document.createElement("input")) ;
		dom_sub_actions.appendChild(document.createElement("br"));
	});
	
	dom_sub_actions.appendChild(create_dom_button("confirm new bang", new_state_2));
	dom_sub_actions.appendChild(create_dom_button("cancel", cancel));
}

// Either : 
// display error messages because the inputs for a new bang are erroneous
// effectively insert the new bang, redraw bang lists and cleans Sub_Actions
// () -> promise[()]
function new_state_2 () {
	if (! stable) { alert("processing, please wait...") ; return }
	var dom_inps = Array.from(dom_sub_actions.querySelectorAll("input")) ;
	var newbang = dom_inps.map(input => input.value) ;
	
	var err_msgs = check_bang(newbang) ;
	if (err_msgs != "") { dom_err_msgs.textContent = err_msgs ; return }
	
	stable = false ;
	storage_get_key("bangs")
	.then(bangs => {
		if (bangs.findIndex(bang => bang[BANG] == newbang[BANG]) == -1) {
			bangs.push(newbang);
			var sorted_bangs = bangs.sort() ;
			storage.set({ bangs: sorted_bangs, modified: true })
			.then(() => {
				dom_modified.textContent = "yes" ;
				redraw_bangs(sorted_bangs);
				dom_sub_actions.textContent = "success new bang" ;
				dom_err_msgs.textContent = "";	
			});
		}
		else dom_err_msgs.textContent = "bang already exists, choose another bang or modify the existing one" ;
	})
	.finally (() => stable = true);
}

// Ask which bang should be modified
// () -> ()
function mod_state_1 () {
	if (! stable) { alert("processing, please wait...") ; return }
	dom_sub_actions.textContent = "";
	dom_err_msgs.textContent = "";
	dom_sub_actions.appendChild(create_dom_span("bang "));
	dom_sub_actions.appendChild(document.createElement("input"));
	dom_sub_actions.appendChild(document.createElement("br"));
	dom_sub_actions.appendChild(create_dom_button("modify this bang", mod_state_2));
	dom_sub_actions.appendChild(create_dom_button("cancel", cancel));
}


// Gets the data of the bang selected by user 
// and puts it in inputs so the user can modify the data
// () -> promise[()]
function mod_state_2 () {
	if (! stable) { alert("processing, please wait...") ; return }
	var bangkey = dom_sub_actions.querySelector("input").value ;
	
	stable = false ;
	storage_get_key("bangs").then(bangs => {
		var ind = bangs.findIndex(bang => bang[BANG] == bangkey) ;
		if (ind == -1) dom_err_msgs.textContent = "bang not found" ;
		else {
			dom_sub_actions.textContent = "";
			dom_err_msgs.textContent = "";
			for (var col = 0 ; col <= 4 ; col ++) {
				dom_sub_actions.appendChild(create_dom_span(LABELS[col] + " "));
				var dom_inp = document.createElement("input");
				dom_inp.value = bangs[ind][col] ;
				dom_sub_actions.appendChild(dom_inp);
				dom_sub_actions.appendChild(document.createElement("br"));
			}
			var dom_hid = document.createElement("input");
			dom_hid.setAttribute("type", "hidden");
			dom_hid.setAttribute("value", bangkey);
			dom_sub_actions.appendChild(dom_hid);
			dom_sub_actions.appendChild(create_dom_button("confirm modify bang", mod_state_3));
			dom_sub_actions.appendChild(create_dom_button("cancel", cancel));
		}
	})
	.finally(() => stable = true);
}

// Either :
// Display error messages from incorrect inputs of step 2
// effectively modifiy the bang and cleans Sub_Actions
// () -> promise[()]
function mod_state_3 () {
	if (! stable) { alert("processing, please wait...") ; return }
	var dom_inps = Array.from(dom_sub_actions.querySelectorAll("input"));
	var modbang = dom_inps.map(input => input.value);
	var original_bangkey = modbang.pop();
	var errs = check_bang(modbang) ;
	if (errs != "") {
		dom_err_msgs.textContent = errs ;
		return ;
	}
	stable = false ;
	storage_get_key("bangs").then(bangs => {
		var mod_bangs ;
		if (modbang[BANG] == original_bangkey) {
			mod_bangs = bangs.map(bang => {
				if (bang[BANG] == modbang[BANG]) return modbang ;
				else return bang ;
			}).sort();
		}
		else {
			var ind = bangs.findIndex(bang => bang[BANG] == modbang[BANG]);
			if (ind != -1) {
				dom_err_msgs.textContent = "new bang key already exists." ;
				return ;
			}
			mod_bangs = bangs.map(bang => {
				if (bang[BANG] == original_bangkey) return modbang ;
				else return bang ;
			}).sort();
		}
		storage.set ({ bangs: mod_bangs, modified: true })
		.then(() => {
			dom_modified.textContent = "yes" ;
			dom_sub_actions.textContent = "success modify bang" ;
			dom_err_msgs.textContent = "" ;
			redraw_bangs(mod_bangs);
		});
	})
	.finally(() => stable = true);
}

// Ask which bang to delete
// () -> ()
function del_state_1 () {
	dom_sub_actions.textContent = "";
	dom_err_msgs.textContent = "";
	dom_sub_actions.appendChild(create_dom_span("bang "));
	dom_sub_actions.appendChild(document.createElement("input"));
	dom_sub_actions.appendChild(document.createElement("br"));
	dom_sub_actions.appendChild(create_dom_button("confirm delete bang", del_state_2));
	dom_sub_actions.appendChild(create_dom_button("cancel", cancel));
}

// effectively delete the bang and cleans Sub_Actions
// () -> promise[()]
function del_state_2 () {
	var bangkey = dom_sub_actions.querySelector("input").value ;
	stable = false ;
	storage_get_key("bangs").then(bangs => {
		var ind = bangs.findIndex(bang => bang[BANG] == bangkey) ;
		if (ind == -1) {
			dom_err_msgs.textContent = "bang not found" ;
			return ;
		}
		var del_bangs = bangs.filter(bang => bang[BANG] != bangkey) ;
		storage.set({ bangs: del_bangs, modified: true })
		.then(() => {
			dom_modified.textContent = "yes" ;
			dom_sub_actions.textContent = "success delete bang" ;
			dom_err_msgs.textContent = "" ;
			redraw_bangs(del_bangs);
		});
	})
	.finally(() => stable = true);
}

// The following functions are not handlers.
// They are just helpers functions.

// adding the bangs to the table in the html
// bangs -> ()
function redraw_bangs (bangs) {
	dom_bangs.textContent = "" ;
	bangs.forEach(bang => {
		var dom_tr = document.createElement("tr") ;
		dom_tr.setAttribute("id", "bang-" + bang[0]) ;
		bang.forEach(column => {
			var dom_td = document.createElement("td");
			dom_td.textContent = column ;
			dom_tr.appendChild (dom_td) ;
		});
		dom_bangs.appendChild (dom_tr) ;
	});
}

// string -> dom_element
function create_dom_span (str) {
	var dom_span = document.createElement("span");
	dom_span.textContent = str ;
	return dom_span ;
}

// string, action -> dom_element
function create_dom_button (str, func) {
	var dom_bt = document.createElement("button");
	dom_bt.textContent = str ;
	dom_bt.addEventListener("click", func) ;
	return dom_bt ;
}

// bang -> string
function check_bang (bang) {
	var err = "";
	if (bang[BANG] == "") err += "bang must not be empty. " ;
	if (bang[BANG].indexOf(" ") != -1) err += "bang must not contain space. " ;
	if (bang[URL_WITHOUT_PARAM].trim() == "") err += "URL without param must not be empty. " ;
	return err ;
}

