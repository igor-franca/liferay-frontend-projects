define(["exports"],function(e){"use strict";function n(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function e(e,n){for(var r=0;r<n.length;r++){var t=n[r];t.enumerable=t.enumerable||!1,t.configurable=!0,"value"in t&&(t.writable=!0),Object.defineProperty(e,t.key,t)}}return function(n,r,t){return r&&e(n.prototype,r),t&&e(n,t),n}}(),t=function(){function e(){n(this,e)}return r(e,null,[{key:"equal",value:function(e,n){if(e===n)return!0;if(e.length!==n.length)return!1;for(var r=0;r<e.length;r++)if(e[r]!==n[r])return!1;return!0}},{key:"firstDefinedValue",value:function(e){for(var n=0;n<e.length;n++)if(void 0!==e[n])return e[n]}},{key:"flatten",value:function(n){for(var r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:[],t=0;t<n.length;t++)Array.isArray(n[t])?e.flatten(n[t],r):r.push(n[t]);return r}},{key:"remove",value:function(n,r){var t=n.indexOf(r),u=void 0;return(u=t>=0)&&e.removeAt(n,t),u}},{key:"removeAt",value:function(e,n){return 1===Array.prototype.splice.call(e,n,1).length}},{key:"slice",value:function(e,n){for(var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:e.length,t=[],u=n;u<r;u++)t.push(e[u]);return t}}]),e}();e["default"]=t});