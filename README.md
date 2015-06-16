jQuery.my
=========
* [__Get/set data__](#retrieving-and-updating-data) 
* [__Validation__](#validation) 
* [__Dependencies__](#dependencies)
* [__Conditional formatting__](#conditional-formatting-and-disabling) 
* [__Form init__](#init-functions) 
* [__Nested forms__](#nested-and-repeated-forms) 
* [__Styling forms__](#styling-forms)

__jQuery.my is a plugin that binds HTML controls with underlying javascript object using declarative MVVM style manifest. Bindings are bi-directional and real-time.__

jQuery.my recognizes standard HTML controls as well as composite controls rendered by jQuery Mobile, nearly all jQuery UI widgets, Redactor, Ace, CodeMirror, Select2 and others. 

Comprehensive validation, conditional formatting and dependencies resolution are available. Forms can be nested – each $.my instance can be used as control for a parent form if any.

Forms are promises – any `.init` function can return promise instead of `undefined` and become async.

jQuery.my also incorporates simple template engine and modal dialog mechanics, which also behaves as promise.

Below API description is not complete, see [jquerymy.com](http://jquerymy.com/) for more detailed API, examples and list of compatible controls.

See [cloudwall.me](http://cloudwall.me) as an example of web-app platform built on top of $.my.

Setup
-----

jQuery.my requires jQuery 1.11+ and [SugarJS 1.4.0+](http://sugarjs.com/). 

```html
<script src="/js/sugar.min.js"></script>
<script src="/js/jquery.min.js"></script>
<script src="/js/jquerymy.min.js"></script>
```
$.my can can be installed from npm – `npm install jquerymy`, same for bower.

Quick start 
-----

```js
var person={};
var manifest = {
	"data": { name:"", metrics:{ age:"" }},
	"init": function ($node, formRuntimeObj) {
		$node.html(
			'<div><input id="name" type="text" /></div>' +
			'<div><input id="age" type="number" /></div>'
		);
	},
	"ui":{
		"#name": { bind: "name" },
		"#age" : { bind: "metrics.age" }
	}
};
// Init $.my
$("#form").my(manifest, person);
```	
Now form inputs are filled with init values and any interaction with controls immidiately mutates `person` object. Dot notation of deep-level bindings is just syntax sugar. It also can be used with arrays in style like `someArray.1`.

First param passed to $.my is denoted below as __manifest__.

Retrieving and updating data
-----

__To get__ form data just read value of the `person` variable or read `$("#form").my("data")`. Second way is good if $.my was initialized without any init value passed. 

__To put__ new data into already initialized instance of $.my call `$("#form").my("data", {name: "Mike"})`. Note you can update data partially. Form is redrawn and revalidated after applying new data .

More complex data bind
-----

The `.bind` field can be defined as a bi-directional function. It receives entire data object and new value as params. 
If `null` is passed function must only return value for DOM control, otherwise function must put value into 
data object and then return value for DOM.

So `bind` function implements both getter and setter – depending on value passed.

```js
$("#form").my({
	ui:{
		"#name": "name",
		"#age" : {
			bind: function (data, value, $control) {
				if (value != null) data.metrics.age = value; 
				return data.metrics.age = 
					(data.metrics.age + "").replace(/\D/g,"");
			}
		}
	}
}, person);
```
Note bind function in example won't allow to input anything than number. Pressing non-num key will do nothing with input, non-num chars are stripped immidiately.

Third param `$control` is jQuery reference to the control being processed, it can be useful for navigating over form. Calling `$control.my("find", "#name")` returns `#name` control for example. 

Validation
-----

There are several ways to validate data received from control. Validator can be a regexp or a function. Functions unlike regexps can return custom error messages depending on value being checked. Check is performed just _before_ executing `.bind`.

If value is incorrect `.my-error` class is applied to the closest DOM container of the control, otherwise this style rule is removed. 

If control is not interactive – we bind some data with `<div>` element for example – `.my-error` class is applied to the element itself, not container.

####RegExp validation
```js
$("#form").my({
	ui:{
		"#name": { 
			bind: "name", 
			check:/^[a-z]{10}$/i,
			error:"10 latin chars" // Optional
		},
		"#age":  { bind: "metrics.age" }
	}
});
```
If user puts something other than 10-letter combination into `#name` input, `class` attribute of the parent `<div>` is set to `.my-error`. 

####Validating with function
Validator function receives same params as `.bind` but executed before bind. Validator must return error message string – or empty string if value is ok.

Unlike `.bind` validator is never called with `value` equal to `null`, it always receives real value.

```js
$("#form").my({
	data:{/*...*/},
	init: function ($node){/*...*/},
	ui:{
		"#name": { 			
			"bind": "name", 
			"check": function (data, value, $control) {
				if (value.length > 20) return "Too long name"; 
				if (!/^[a-z]+$/.test(value)) return "Only letters allowed"; 
				return "";
			}			
		},
		"#age": "age"
	}
});
```
Messages returned by validator are put into DOM element with class `.my-error-tip`, which must be located inside the control’s container. So to make messages visible we must explicitly add this element into html. If no such elemnt found error message will be added as `title` attribute to the control itself. If control has own `title` it is stashed until error corrected. 
```html
<div>
	<input id="name" type="text" />
	<span class="my-error-tip"></span>
</div>
```	
####Checking entire form has no errors
`$("#form").my("errors")` returns object, which keys are invalid fields and their values are error messages. If all the fields are ok, `{}` is returned. If form has child forms, their errors are mapped to appropriate branch.

To spot whether entire data is valid or not call `$("#form").my("valid")`.
	
Dependencies
-----

Let it be a form that calculates product of two values. We need to recalculate product each time any of factors changes.
```js
$("#form").my({
	data:{ num1:"10", num2:"1.5" },
	init: function ($node){/*...*/},
	ui:{
		"#factor1": "num1", 
		"#factor2": "num2",
		"#product": {
			bind: function (data) {
				return data.num1 * data.num2;
			},
			watch: "#factor1,#factor2" //shorthand for ["#factor1", "#factor2"]
		}
	}
});
```
Product is not mapped to data – `.bind` function does not save anything. It only returns value to put in `#product` DOM element. Every time `#factor1` or `#factor2` receive input `#product` is recalculated.

There is another syntax to define dependencies.
```js
$("#form").my({
	ui:{
		"#factor1": {
			bind: "num1", 
			recalc: "#product"
		},
		"#factor2": "num2",
		"#product": {
			bind: function (data) {return data.num1 * data.num2},
			watch: "#factor2"
		}
	}
});
```
It behaves the same way. Note that `.recalc` is processed prior to `.watch`. So if a field depends on some other fields via both `.recalc` and `.watch` attributes, recalcs go first.

Loop dependencies are resolved correctly.

Conditional formatting and disabling
-----

$.my can apply different classes depending on data object state.
```js
$("#form").my({
	ui:{
		"#name": { 			
			bind: "name", 
			recalc: "#age",
			css: {
				"orange":/^.{10}$/
			}	
		},
		"#age": {
			bind: "age",
			css:{
				":disabled": function (data, value) {
					return data.name.length == 0;
				}
			}
		}
	}
});
```
Here if `#name` is exactly 10 chars, its container will receive class `orange`. If value doesn't match regexp then class `orange` is removed.

Input `#age` depends on value of `#name` field and is disabled if `data.name` is empty.

Conditional formatting over appropriate field is applied after `.check` and `.bind`.

Init functions
-----

####Preparing form during initialization
If underlying form is just a HTML carcass it's good idea to enrich it during $.my instance initialization without any code outside the manifest.
```js
$("#form").my({
	data: { range: [30, 70] },
	init: function ($node) {
		$node.html('<input id="range" />')
	},
	ui:{
		"#range": { 	
			init: function ($control) {
				$control.slider(range: true, min: 0, max: 100);
			},	
			bind: "range"
		}
	}
});
```
Here we apply jQuery.UI Slider plugin over `#range` control. Data attribute `range` will receive array of two values – slider start and stop. On start control will be set to 30–70 range.

Certainly HTML carcass itself can be generated using `init` function, placed as child of manifest's root – as in above example. 

####Async init
To become async `.init` function must return promise of any sort (so-called ‘then-able’). Initialization sequence continues when promise is resolved or fails if promise is rejected.

```js
$("#form")
.my({
	data: { name:"" },
	init: function ($node, runtime) {
		var promise = $.ajax({
			url:"http://some.url"
		}).then(function (res) {
			// We received responce, gen form HTML
			$node.html('<input id="name" type="text"/>')
			// Assume res is string, mount default data
			runtime.data.name = res;
		});
		
		return promise;
	},
	ui:{"#name": "name"}
})
.then(function (data){
	// Do something when form init finished 
})
.fail(function(errMessage) {
	// Do something if init failed
});
```
jQuery AJAX implementation returns promise, so we may return `$.ajax` result directly. When data is received promise is resolved and initialization continues. When it is finished, promise returned by $.my is resolved with form’s `.data`.

Promises are new to community and yet have no strict standard – so to simplify code `$.Deferred()` model is used inside jQuery.my. 

Nested and repeated forms
-----

Each DOM node which was instantiated with $.my can act as a single control for some parent $.my form. DOM node `#child` is instantiated with own manifest in example. 
```js
$("#form")
.my({
	data: { name:"" , child:{}},
	init: function ($node, runtime) {
		//Draw HTML
	},
	ui:{
		"#name": "name",
		"#child" :{
			bind:"child", 
			check:true,		//ensures child’s errors invalidate parent
			manifest:{
				data:{/* child’s data struct */},
				init:{/* child’s init, can be async */},
				ui:{ /* child’s ui */}
			}
		}
	}
})
````
__To build list of nested forms__ just bind it with array. Below example builds list of similar array elements. 
```js
$("#form")
.my({
	data: { name:"" , child:[ /* array of elts */]},
	init: function ($node, runtime) {
		//Draw HTML
	},
	ui:{
		"#name": "name",
		"#child" :{
			bind:"child", 
			check:true,
			list:'<div class="someClass"></div>', 	//optional
			init: function ($list) {				//optional
				// Makes list items sortable by drag 
				// and drop, jQuery UI plugin required
				$list.sortable();
			},
			manifest:{
				data:{/* child’s data struct */},
				init:{/* child’s init, can be async */},
				ui:{ /* child’s ui */}
			},
			
		}
	}
})
````

Tuning behavior
-----

####Events
$.my understands many types of controls and automatically selects appropriate event handler(s) to provide real-time binding. It’s a kind of device driver for different plugins and conventional HTML inputs or noninteractive elements.

But sometimes you need no realtime response – in case of buttons or links for example. Bind function must be executed only when button is really clicked, not while initializing. 
```js
$("#form").my({
	ui:{
		"#button": { 			
			bind: function (data, value) {
				if (value != null) {
					//do something
				}
			}, 
			events: "click,dblclick"	
		}
	}
});
```
The `events` attribute here defines that bind executed after click or doubleclick events on `#button` element. Note `.bind` returns `undefined` here – this syntax allows us to keep control's content intact. 
####Delays
There are several cases bind function must have kind of an anti-jitter. If control is jQuery.UI Slider or conventional HTML5 `<input type="range">` it’s reasonable to exec `.bind` when slider stops. 
Complex bind function executed every pixel slider moves can be real CPU and RAM hog.

```js
$("#form").my({
	ui:{
		"#slider": { 			
			bind: function (data, val) { /* do somth*/ }, 
			delay: 150	
		}
	}
});
```
In this example `.bind` starts only after last event within 150ms. If change events are raised more often then one in 150ms, they are supressed. See [live demo](http://jquerymy.com/s/delay078.html) – its much more clear than description.


Reusable code snippets
-----

Some functions or fields inside manifest can contain code with matching fragments. It can be same regexps for different fields, or some dictionaries used here and there etc. They can be stored at manifest's root and acessed from `ui` section members by reference.
```js
$("#form").my({
	NumCheck:/^\d+$/,
	ForbiddenPasswords:["123","qwerty"],
	ui:{
		"#num": { 	
			bind: "num",
			check: "NumCheck"
		},
		"#pwd":{
			bind:"password",
			check: function (data, value) {
				var pwdList = this.ForbiddenPasswords;
				if (pwdList.indexOf(value) == -1) return "Too simple password!";
				return "";
			}
		}
	},
	SomeFunction: function () { // this points to runtime manifest }
});
```
Not only checks but every function defined in `.ui` section receives `this` pointing to runtime manifest. Functions located on the first level of manifest (`SomeFunction` in example above) also receive `this` pointing to runtime. 


Manifest delivery
-----

There is buil-in method to convert manifest with functions and regexps into conventional JSON. It's useful for on-demand manifest delivery using ajax calls. `$.my.tojson(manifest)` 
returns correct JSON-encoded string with all functions and regexps converted to strings.

This approach is used in CouchDB to store internal functions as JSON docs. It's quite simple and straightforward.
```
$.my.tojson({
	a:function(){}, 
	b:/./
})  
>> '{"a":"function (){}", "b":"new RegExp(/./)"}'
```	
Method `$.my.fromjson(someJSON)` unwinds encoded functions and regexps into full-featured code.

There is no need to decipher encoded manifests before passing them to $.my – they are unwinded automatically.

Styling forms
-----

Manifest can contain `style` property that defines hierarchy of css rules for form instance. Some rules can be static and other calculated according to form’s init data.
```js
{
	id:"ManifestId",
	data:{...},
	init function(){...},
	ui:{...},
	style:{
		" .red": "color:#c02",
		" .item":{
			" .name": "font-size:110%",
			" .user": function ($form, form) {
				if ($form.width()<500) return "display:none";
				return "font-size:80%";
			}
		},
		" h2,h3":{
			"": 		 "font-weight:bold"
			".light": 	 "font-weight:normal",
			">img.icon": "width:24px;"
		}
	}
}
```
Syntax is more or less straightforward. Note spaces before most rules. Above example will be rendered in two `<style>` sections. 
```html
<style id="my-manifest-abc123def">
	.my-manifest-abc123def .red:{color:#c02}
	.my-manifest-abc123def .item .name {font-size:110%}
	.my-manifest-abc123def .h2 {font-weight:bold}
	...
</style>
<style id="my-form-098fea432">
	.my-form-098fea432 .item .user:{display:none}
</style>
```

First is static and generated from string definitions. If manifest – like in example – has `id`, this `<style>` section generated only once regardless of number of manifest instances running. When last instance dies, this section will be removed.

Second `<style>` section is unique for each manifest’s instance and is generated from rules, defined with functions. They can tune rules according to form size or init data. In example if container is too narrow, no `.user` is shown.

Style section is evaluated before init to ensure init see real geometry of objects it puts to the page.


Settings
-----

Below parameters of $.my instance can be tuned for an entire form:
```js
var manifest = {
	params:{
		delay: 0,		//global anti-jitter delay, can be overriden
		depth: 2,		//depth of chained/looped recalc resolution
		errorTip: ".my-error-tip",		//jQuery selector for error msg
		errorCss: "my-error"			//class to mark invalid controls
	},
	data: {...},
	init: function ($form) {...},
	ui:{...}
};
```
Full set of settings is quite long, they are listed and explained at [jquerymy.com/api.html](http://jquerymy.com/api.html#CW-settings)

Compatibility
-----
Works fine on IE9+ and other browsers. IE8 is also supported, but apps require thorough testing 
and optimizations to avoid lags.
