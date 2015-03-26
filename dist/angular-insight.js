(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

// @ngInject
module.exports = function insightDirective ($q, filterFilter, orderByFilter) {
	return {
		restrict: 'A',
		require: '?ngModel',
		templateUrl: function(elem, attr) {
			return attr.templateUrl || 'insight.html';
		},
		scope: {
			insight: '='
		},
		replace: true,

		compile: function(tElement, tAttrs){
			if(tAttrs.optionTemplateUrl){
				var optionRows = tElement[0].querySelectorAll("[option-row]");

				_.forEach(optionRows, function(optionRow){
					optionRow.setAttribute("template-url", tAttrs.optionTemplateUrl);
				});
			}

			if(tAttrs.assignedOptionTemplateUrl){
				var assignedOptionRows = tElement[0].querySelectorAll("[assigned-option-row]");

				_.forEach(assignedOptionRows, function(optionRow){
					optionRow.setAttribute("template-url", tAttrs.assignedOptionTemplateUrl);
				});
			}

			return this.link;
		},

		link: function ($scope, element, attrs, ngModelCtrl) { //todo $scope -> scope
			var insight = $scope.insight;
			insight.data = insight.data || [];

			if(!insight.fieldDefs){
				throw new Error("Insight fieldDefs is required");
			}

			$scope.state = {};
			$scope.state.preview = {
				usePreview: false,
				showPreview: true
			};

			$scope.favorites = [];
			$scope.recents = insight.data ? insight.data.slice(0,8) : []; //placeholder until we have real recents

			$scope.assignedItems = [];

			if(ngModelCtrl){
				ngModelCtrl.$render = function () {
					$scope.assignedItems = [];

					_.forEach($scope.insight.data, function(item){
						item.assigned = false;
					});

					if(ngModelCtrl.$modelValue && ngModelCtrl.$modelValue.map){
						ngModelCtrl.$modelValue
							.map(function (item) {
								var existing = insight.data[findIndexByIdentifier(insight.data, item)];
								return existing || item;
							})
							.forEach(assignItem);
					}
				};
			}

			$scope.updateOptions = function (){
				if(_.isFunction(insight.loadPage)){
					loadPage()
						.then(function(options){
							$scope.filteredOptions = filterOptions(options);
						});
				} else {
					$scope.filteredOptions = filterOptions(insight.data);
				}
			};

			$scope.preventEnter = function ($event) {
				if ($event.keyCode === 13) {
					$event.preventDefault();
				}
			};

			function loadPage(){
				return $q.when(insight.loadPage($scope.insight.query || ''))
					.then(function (data) {
						return data && data.map(function (item) {
							var existing = insight.data[findIndexByIdentifier(insight.data, item)];
							return existing ? _.extend(existing, item) : item;
						});
					});
			};

			var assignItem = $scope.assignItem = function(item){
				item.assigned = true;
				$scope.assignedItems.push(item);

				if (findIndexByIdentifier(insight.data, item) === -1) {
					insight.data.push(item);
				}
				tryUpdateModel();
			}

			var removeItem = $scope.removeItem = function(item) {
				item.assigned = false;

				var index = findIndexByIdentifier($scope.assignedItems, item);
				if (index !== -1) {
					$scope.assignedItems.splice(index,1);
					tryUpdateModel();
				}
			};

			var toggleItemAssignment = $scope.toggleItemAssignment = function(item) {
				return item.assigned ? removeItem(item) : assignItem(item);
			};

			$scope.closeOptions = function() {
				$scope.showOptions = false;
				$scope.insight.query = '';
				$scope.focus = false;
			};

			$scope.getDataType = function(item){
				var fieldDef = $scope.insight.fieldDefs.dataType;
				if(_.isFunction(fieldDef)){
					return fieldDef(item);
				}
				return item[fieldDef];
			}

			$scope.getIconClass = function(item){
				var dataType = $scope.getDataType(item);

				var dataTypeClasses = insight.dataTypes || {};
				return dataTypeClasses[dataType] || insight.dataType;
			}

			var filterOptions = $scope.filterOptions = function(data){
				data = data || [];
				if(!insight.loadPage){
					data = filterFilter(data, $scope.insight.query);
				}
				data = orderByFilter(data, $scope.insight.fieldDefs.display);

				return data;
			}

			function tryUpdateModel() {
				if (!ngModelCtrl) {
					return;
				}

				ngModelCtrl.$setViewValue($scope.assignedItems);
			}

			function findIndexByIdentifier (array, item) {
				var properties = {};
				properties[insight.fieldDefs.identifier] = item[insight.fieldDefs.identifier];
				return _.findIndex(array, properties);
			}
		}
	}
};
module.exports.$inject = ["$q", "filterFilter", "orderByFilter"];


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
(function (global){
var angular = (typeof window !== "undefined" ? window.angular : typeof global !== "undefined" ? global.angular : null);

var path = require('path');

module.exports = angular
	.module('insight', ['ngSanitize', 'ui.highlight', 'ui.bootstrap'])
	.directive('insight', require('./insightDirective'))
	.directive('optionRow', require('./optionRowDirective'))
	.directive('assignedOptionRow', require('./optionRowDirective'))
	.run(['$templateCache', function($templateCache) {
		$templateCache.put('insight.html', "<div class=\"preview-widget\" ng-class=\"{ 'preview-active' : state.preview.showPreview }\" ng-keydown=\"preventEnter($event)\">\n\n\t<button type=\"button\"\n\t        class=\"btn btn-preview\"\n\t        ng-model=\"state.preview.showPreview\"\n\t        ng-show=\"state.preview.usePreview\"\n\t        btn-checkbox\n\t        btn-checkbox-true=\"true\"\n\t        btn-checkbox-false=\"false\">\n\t\t<span class=\"glyphicons eye_close\" ng-show=\"state.preview.showPreview\"></span>\n\t\t<span class=\"glyphicons eye_open\" ng-hide=\"state.preview.showPreview\"></span>\n\t</button>\n\n\t<div ng-class=\"state.preview.showPreview &amp;&amp; state.preview.usePreview ? 'col-xs-7' : 'col-xs-12'\" class=\"assigned-items\">\n\t\t<div class=\"insight\"\n\t\t     ng-mouseenter=\"focus = true\">\n\n\t\t\t<div class=\"search-field-wrapper\" ng-class=\"{focus:focus &amp;&amp; showOptions}\">\n\n\t\t\t\t<div class=\"search-field-inner\">\n\t\t\t\t\t<div class=\"flex-fill\">\n\t\t\t\t\t\t<div class=\"search-field\" ng-class=\"{focus:focus &amp;&amp; showOptions }\">\n\t\t\t\t\t\t\t<span class=\"glyphicons search icon\" ng-hide=\"state.loading\"></span>\n\t\t\t\t\t\t\t<span class=\"glyphicons refresh icon\" ng-show=\"state.loading\"></span>\n\t\t\t\t\t\t\t<button type=\"button\" class=\"btn btn-close\"\n\t\t\t\t\t\t\t\tng-show=\"showOptions\"\n\t\t\t\t\t\t\t\tng-click=\"closeOptions()\">\n\t\t\t\t\t\t\t\tDone\n\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t<input class=\"input\" ng-model=\"insight.query\"\n\t\t\t\t\t\t\t       ng-click=\"showOptions = true; updateOptions()\"\n\t\t\t\t\t\t\t       ng-model-options=\"{ debounce: insight.loadPage &amp;&amp; 300 || 0}\"\n\t\t\t\t\t\t\t       ng-change=\"updateOptions()\"\n\t\t\t\t\t\t\t       placeholder=\"Find items ...\">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div ng-hide=\"state.preview.showPreview\" class=\"preview-spacer\"></div>\n\t\t\t\t</div>\n\n\t\t\t\t<!-- user is searching -->\n\t\t\t\t<div class=\"widget-options animate-if\" ng-if=\"showOptions\">\n\t\t\t\t\t<div class=\"scroll-container\">\n\n\t\t\t\t\t\t<div ng-show=\"insight.query &amp;&amp; !filteredOptions.length\">No results found.</div>\n\n\t\t\t\t\t\t<div ng-if=\"!state.preview.showPreview\"\n\t\t\t\t\t\t     option-row\n\t\t\t\t\t\t     ng-repeat=\"item in filteredOptions\"\n\t\t\t\t\t\t     class=\"insight-option-row\"\n\t\t\t\t\t\t     ng-class=\"{assigned:item.assigned}\"\n\n\t\t\t\t\t\t     selection-model\n\t\t\t\t\t\t     selection-model-cleanup-strategy=\"deselect\"\n\t\t\t\t\t\t     selection-model-on-change=\"change(item)\">\n\t\t\t\t\t\t</div>\n\n\t\t\t\t\t\t<div ng-if=\"state.preview.showPreview\"\n\t\t\t\t\t\t     option-row\n\t\t\t\t\t\t     ng-repeat=\"item in filteredOptions\"\n\t\t\t\t\t\t     class=\"insight-option-row\"\n\t\t\t\t\t\t     ng-class=\"{assigned:item.assigned}\"\n\n\t\t\t\t\t\t     selection-model\n\t\t\t\t\t\t     selection-model-cleanup-strategy=\"deselect\"\n\t\t\t\t\t\t     selection-model-on-change=\"change(item)\">\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\n\t\t\t\t<!-- safari style browse options -->\n\t\t\t\t<div class=\"widget-options animate-if\" ng-if=\"!filteredOptions.length &amp;&amp; !insight.query &amp;&amp; showOptions\">\n\t\t\t\t\t<div class=\"scroll-container\" ng-if=\"state.preview.showPreview\">\n\n\t\t\t\t\t\t<div class=\"subhead\">Recent</div>\n\n\t\t\t\t\t\t<div option-row\n\t\t\t\t\t\t     ng-repeat=\"item in recents\"\n\t\t\t\t\t\t     class=\"insight-option-row\"\n\t\t\t\t\t\t     ng-class=\"{assigned:item.assigned}\"\n\n\t\t\t\t\t\t     selection-model-on-change=\"change(item)\"\n\t\t\t\t\t\t     selection-model>\n\t\t\t\t\t\t</div>\n\n\t\t\t\t\t</div>\n\n\t\t\t\t\t<div class=\"scroll-container\" ng-if=\"!state.preview.showPreview\">\n\n\t\t\t\t\t\t<div class=\"subhead\">Recent Items</div>\n\n\t\t\t\t\t\t<div option-row\n\t\t\t\t\t\t     ng-repeat=\"item in recents\"\n\t\t\t\t\t\t     class=\"insight-option-row\"\n\t\t\t\t\t\t     ng-class=\"{assigned:item.assigned}\"\n\n\t\t\t\t\t\t     selection-model-on-change=\"change(item)\"\n\t\t\t\t\t\t     selection-model>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<div class=\"widget-members\"  ng-class=\"{focus:focus &amp;&amp; showOptions}\">\n\t\t\t\t<div class=\"scroll-container\">\n\t\t\t\t\t<div ng-show=\"assignedItems.length === 0\" style=\"color: gray\">\n\t\t\t\t\t\tNo items assigned.\n\t\t\t\t\t</div>\n\n\t\t\t\t\t<div assigned-option-row\n\t\t\t\t\t     ng-repeat=\"item in filterOptions(assignedItems) | limitTo: 8\"\n\t\t\t\t\t     class=\"insight-option-row\"\n\t\t\t\t\t     selection-model-on-change=\"change(item)\"\n\t\t\t\t\t     selection-model>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"overlay\" ng-show=\"showOptions === true\" ng-click=\"closeOptions()\"></div>\n\t\t</div>\n\t</div>\n\n\t<div class=\"col-xs-5 preview-column animate-if\" ng-if=\"state.preview.showPreview\" ng-class=\"{ 'show-preview': showOptions }\">\n\n\t\t<div class=\"scroll-container\">\n\n\t\t\t<div class=\"scroll-message\" ng-show=\"!filteredAssignedItems.length &amp;&amp; !filteredData.length &amp;&amp; !showMessage\">\n\t\t\t\t<h3>No Items Selected</h3>\n\t\t\t</div>\n\t\t\t<div class=\"scroll-message\" ng-show=\"showMessage\">\n\t\t\t\t<h3>{{ messageItem.name }} was removed</h3>\n\t\t\t</div>\n\n\t\t\t<!-- showPreview has to be specific to data type -->\n\t\t\t<div class=\"preview-item\"\n\t\t\t     ng-repeat=\"item in filteredAssignedItems = ( assignedItems | filter:{selected:true} | limitTo:1 | orderBy:reverse )\"\n\t\t\t     ng-if=\"!query\">\n\t\t\t\t<h1>\n\t\t\t\t\t<span class=\"circle glyphicons\" ng-class=\"insight.dataType || insight.dataTypes[item[insight.fieldDefs.dataType]]\"></span>\n\t\t\t\t</h1>\n\n\t\t\t\t<h3>{{ item.name }}</h3>\n\t\t\t\t<p>{{ item.description }}</p>\n\n\t\t\t\t<p ng-if=\"item.roles.length\" ng-repeat=\"role in item.roles track by $index\">{{ role.name }}</p>\n\t\t\t\t<p ng-if=\"!item.roles.length\">No assigned roles.</p>\n\n\t\t\t\t<p ng-if=\"item.users.length\" ng-repeat=\"user in item.users track by $index\">{{ user }}</p>\n\t\t\t\t<p ng-if=\"!item.users.length\">No assigned users.</p>\n\t\t\t</div>\n\n\n\t\t\t<div class=\"preview-item\" ng-repeat=\"item in filteredData = ( insight.data | filter:{selected:true} | limitTo:1 | orderBy:reverse )\"\n\t\t\t     ng-if=\"query\">\n\t\t\t\t<h1>\n\t\t\t\t\t<span class=\"circle glyphicons\" ng-class=\"insight.dataType || insight.dataTypes[item[insight.fieldDefs.dataType]]\"></span>\n\t\t\t\t</h1>\n\t\t\t\t<h3>{{ item.name }}</h3>\n\t\t\t\t<p>{{ item.description }}</p>\n\n\t\t\t\t<p ng-if=\"item.roles.length\" ng-repeat=\"role in item.roles track by $index\">{{ role.name }}</p>\n\t\t\t\t<p ng-if=\"!item.roles.length\">No assigned roles.</p>\n\n\t\t\t\t<p ng-if=\"item.users.length\" ng-repeat=\"user in item.users track by $index\">{{ user }}</p>\n\t\t\t\t<p ng-if=\"!item.users.length\">No assigned users.</p>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n");
		$templateCache.put('option-row.html', "<div ng-click=\"toggleItemAssignment(item)\">\n\t<button type=\"button\" class=\"btn btn-link pull-right btn-assigned\" ng-show=\"item.assigned\">\n\t\t<span class=\"glyphicons ok_2\"></span>\n\t</button>\n\t<button type=\"button\" class=\"btn btn-link pull-right\" ng-hide=\"item.assigned\">\n\t\t<span class=\"glyphicons plus\"></span>\n\t</button>\n</div>\n<div ng-click=\"toggleItemAssignment(item)\">\n\t<span class=\"circle glyphicons\" ng-class=\"getIconClass(item)\"></span>\n</div>\n<div class=\"flex-fill\" ng-click=\"toggleItemAssignment(item)\">\n\t<span ng-bind-html=\"item[insight.fieldDefs.display] | highlight:insight.query\"></span>\n</div>\n\n");
		$templateCache.put('assigned-option-row.html', "<div>\n\t<span class=\"circle glyphicons\" ng-class=\"getIconClass(item)\"></span>\n</div>\n<div class=\"flex-fill\">\n\t{{ item[insight.fieldDefs.display] }}\n</div>\n<div>\n\t<button type=\"button\" class=\"btn btn-link pull-right remove-assigned-item\"\n\t\t\tng-click=\"removeItem(item)\"\n\t\t\tselection-model-ignore>\n\t\t<span class=\"glyphicons remove_2\"></span>\n\t</button>\n</div>\n\n");
	}])
	.name;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./insightDirective":1,"./optionRowDirective":5,"path":3}],3:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":4}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
module.exports = function() {
	return {
		templateUrl: function(tElement, tAttrs) {
			return tAttrs.templateUrl || 'option-row.html';
		}
	}
};

},{}]},{},[2]);
