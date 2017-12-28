/**
 * @description 读取base64编码
 * @type {method}
 * @param {method} callback({string} data) - 加载完成后回调函数
 * @return {void}
 */

$(function () {
	window.filereader = (function () {
		return function (callback) {
			var fr = new FileReader();
			var $file = $('<input></input>').attr('type', 'file').css('display', 'none').appendTo($('body'))
			.change(function () {
				if(this.files.length === 0) return;
				fr.readAsDataURL(this.files[0]);
			});
			$file.click();
			fr.onload = function (data) {
				callback(data.target.result);
				$file.remove();
			};
		};
	})();
});