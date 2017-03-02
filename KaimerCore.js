
// ----------------------	START	单绑定触控事件		------------------------------

/**
 * 为表单绑定触控事件
 * @param	element		要绑定事件的表单
 * @param	functions	外部函数集合
 *				clickCB		函数:单击事件
 *				dbclickCB	函数:双击事件
 *				dragStart	单点拖动开始事件
 *				dragMove	单点拖动过程事件	这个函数有两个参数, 相对原点的X偏移, 相对原点的Y偏移.
 *				dragOver	单点拖动结束事件
 *				pinStart	多点触控开始事件	
 *				pinMove		多点触控过程事件	两个参数:两根手指的相对拉开距离,两根手指相对拉开的百分比
 *				pinOver		多点触控结束事件
 *				touchstart	touchstart外部回调	暂时是没什么用
 *
 * 从单点移动状态转换到多点触控,需要触发单点移动的结束事件, 从多点触控转换到单点触控,要能触发单点拖动的开始事件.
 *		在此, functions.dragStart这个函数之前, 需要确认,还在屏幕上的是哪根手指
 *
 * @Arcadia 2017-03-02 添加功能:解除已添加的事件.
 *          调用元素的成员函数removeAllEventListeners,以解除在此添加的事件监听
 *          删除功能:阻止页面滚动. 因每个事件都加了preventDefault(为了微信的多点触控兼容)所以阻止页面滚动的preventDefault没必要再加.
 *          如果用户要滚动页面,可以操作页面的其它部份.
 *
 *
 * @Arcadia 2015-05-30
 */
function bindTouchEvents(element,functions){
	'use strict';
	
	var _clickDown;//记录刚按下的时间
	//var _clickUp;//记录抬起时间
	
	var _inDraw=false;//是不是单点拖动
	var _inMultiDraw=false;//是不是多点拖动 , 为了单击事件
	var _fingerNum=0;//手指数目
	
	var _click1Time=0;//第一次单击的时间
	//var _click2Time=9999;//第二次单击的时间
    
	var _originDragX;//刚按下时,坐标
	var _originDragY;//刚按下时,坐标
	//var _originDragX,_originDragY;//
	var _currentDragX;
	var _currentDragY;
	
	var _pin1={
		originX:0,
		originY:0,
		currentX:0,
		currentY:0
	}
	var _pin2={
		originX:0,
		originY:0,
		currentX:0,
		currentY:0
	}
	var _pinOriginDistance=0;//两指原始距离.
	var _pinCenterX=0;
	var _pinCenterY=0;//两点间中心, 用于放大指定区域
	
	
	//外部函数处理:
	if( typeof functions.clickCB != 'function'){
		functions.clickCB =function(){}
	}
	
	if( typeof functions.dbclickCB != 'function'){
		functions.dbclickCB =function(){}
	}
	
	if( typeof functions.dragStart != 'function'){
		functions.dragStart =function(){}
	}
	
	if( typeof functions.dragMove != 'function'){
		functions.dragMove =function(){}
	}
	
	if( typeof functions.dragOver != 'function'){
		functions.dragOver =function(){}
	}
	
	if( typeof functions.pinStart != 'function'){
		functions.pinStart =function(){}
	}
	
	if( typeof functions.pinMove != 'function'){
		functions.pinMove =function(){}
	}
	
	if( typeof functions.pinOver != 'function'){
		functions.pinOver =function(){}
	}
	
	if( typeof functions.touchstart != 'function'){
		functions.touchstart =function(){}
	}
	//END 外部函数处理
	

    var touchStart,touchMove,touchEnd;



	/**
	 * 有可能两个点在同一瞬间按下,
	 */
	element.addEventListener("touchstart",touchStart=function(e){
		e.preventDefault();// 兼容微信 Arcadia 2017-02-25
		restoreClickDown(e);
		
		_clickDown=e.timeStamp;
		
		//this.addEventListener('touchmove',functionCantMove,false);
		
		//手指:
		_fingerNum+=e["changedTouches"].length;
		_fingerNum=numIn(_fingerNum,0,2);
		
		if(_fingerNum>1)
		{
			_inDraw=false;
			functions.dragOver();
		}
		else{//只记录单点的, 以免第二根手指下去再离开对此有影响 
			_originDragX=e["changedTouches"][0]["clientX"];//给单点移动用.
			_originDragY=e["changedTouches"][0]["clientY"];
			_currentDragX=e["changedTouches"][0]["clientX"];
			_currentDragY=e["changedTouches"][0]["clientY"];
		}
		
		if(e["changedTouches"].length > 1){
			_pin1.originX=e["changedTouches"][0]["clientX"];
			_pin1.originY=e["changedTouches"][0]["clientY"];
			_pin1.currentX=_pin1.originX;
			_pin1.currentY=_pin1.originY;
			
			_pin2.originX=e["changedTouches"][1]["clientX"];
			_pin2.originY=e["changedTouches"][1]["clientY"];
			_pin2.currentX=_pin2.originX;
			_pin2.currentY=_pin2.originY;
			
			_inMultiDraw=true;//是不是多点拖动 , 为了单击事件
			

			setDistanceAndCenter();
			functions.pinStart(_pinOriginDistance,_pinCenterX,_pinCenterY);
		}else if(_fingerNum==2){//第二根手指之后再按下的情况
			_pin1.originX=_currentDragX;
			_pin1.originY=_currentDragY;
			_pin1.currentX=_currentDragX;
			_pin1.currentY=_currentDragY;
			if(!_pin1.originX){
				_pin1.originX=_originDragX;
				_pin1.originY=_originDragY;
				_pin1.currentX=_originDragX;
				_pin1.currentY=_originDragY;
			}
			
			_pin2.originX=e["changedTouches"][0]["clientX"];
			_pin2.originY=e["changedTouches"][0]["clientY"];
			_pin2.currentX=e["changedTouches"][0]["clientX"];
			_pin2.currentY=e["changedTouches"][0]["clientY"];
			
			_inMultiDraw=true;//是不是多点拖动 , 为了单击事件
			
			setDistanceAndCenter();//更新两点距离与中间点
			functions.pinStart(_pinOriginDistance,_pinCenterX,_pinCenterY);
		}
		
		
		return false;
	});
	
	/**
	 * 处理单击与双击
	 * 若是有拖动, 就不是点击
	 * 
	 */
	element.addEventListener("touchend",touchEnd=function(e){
		e.preventDefault();// 兼容微信 Arcadia 2017-02-25
		restoreClickUp(e);//为了还原单击

		if(e.timeStamp-_clickDown < 200 && _inDraw == false && _inMultiDraw==false){
			
			functions.clickCB();
			_fingerNum=0;//若有单击,清空手指数, 要不相动动不了 (可能IOS,在应用间切换才有这情况) //这步在还原单击里有做了

			if(e.timeStamp-_click1Time < 800){
				functions.dbclickCB();
				_click1Time=0;
			}else{
				_click1Time=e.timeStamp;
			}
		}
		/*

		*/
		//this.removeEventListener('touchmove',functionCantMove,false);//允许屏幕滚动
		
		var oldFingerNum=_fingerNum;
		
		//手指:
		_fingerNum-=e["changedTouches"].length;
		_fingerNum=numIn(_fingerNum,0,2);

		
		if(_fingerNum==1){//手指数还剩下1 , 这时是可以做拖动操作的.
			_originDragX=e["changedTouches"][0]["clientX"];//给单点移动用.
			_originDragY=e["changedTouches"][0]["clientY"];
			functions.dragStart();
			
			functions.pinOver();
			_inMultiDraw=false;//是不是多点拖动 , 为了单点拖动事件

		}
		if(_fingerNum==0){
			_inMultiDraw=false;//是不是多点拖动 , 为了单击事件
			if(oldFingerNum==2)
				functions.pinOver();//若之前, 有两个点, 才触发捏撑结束
			
			if(_inDraw===true){
				_inDraw=false;
				functions.dragOver();
			}
		}
		
		return false;
	});
	
	/**
	 * 处理单点移动
	 * 
	 */
	element.addEventListener("touchmove",touchMove=function(e){
		e.preventDefault();// 兼容微信 Arcadia 2017-02-25
		restoreClickMove(e);//为了还原单击
		if(_inDraw===false && _fingerNum==1 ){
			_inDraw=true;
			_originDragX=e["changedTouches"][0]["clientX"];//给单点移动用.
			_originDragY=e["changedTouches"][0]["clientY"];
			functions.dragStart();
		}else if(_fingerNum==2){
			_inMultiDraw=true;//是不是多点拖动 , 为了单击事件
		}
		setDistanceAndCenter();
		if(_inMultiDraw){//多点移动的状态.
			choseCloseOneAndUpdate(e);
			functions.pinMove(_pinOriginDistance,_pinCenterX,_pinCenterY);
			
		}

		if(_inDraw){
			_currentDragX=e["changedTouches"][0]["clientX"];
			_currentDragY=e["changedTouches"][0]["clientY"];
			functions.dragMove( _currentDragX - _originDragX , _currentDragY - _originDragY );
		}
		
	});

    /**
     * 把一个成元函数加到标签中,使外部可以通过这个函数,解除所有的事件处理
     *
     */
    element.removeAllEventListeners = function(){
        element.removeEventListener("touchstart",touchStart);
        element.removeEventListener("touchend",touchEnd);
        element.removeEventListener("touchmove",touchMove);
        //element.removeEventListener('touchmove',functionCantMove);
    }

	///**
	// * 在图片裁剪工作时, 不让页面因触控操作而滚动
	// */
	//function functionCantMove(e){
	//	e.preventDefault();
	//}
	
	/**
	 * 还原单击模块:
	 *		独立的单击判断, 在按住一根手指头的情况下也能用另一根手指触发
	 *		为能方便取消所有操作
	 *		可能Android不用此操作, 大多麻烦事都来自ios
	 */
	var restoreClickStart;//还原单击的按下时间
	var restoreClickorigin;//只记录X坐标, 没有位移才可以作为单击
	function restoreClickDown(e/*事件数据*/){
		restoreClickStart=e.timeStamp;
		restoreClickorigin=e["changedTouches"][0]["clientX"];
	}
	function restoreClickMove(e){
		if( Math.abs( e["changedTouches"][0]["clientX"]-restoreClickorigin) >1){
			restoreClickStart=0;
		}
	}
	function restoreClickUp(e){
		if(e.timeStamp-restoreClickStart < 200){
			_inDraw=false;//是不是单点拖动
			_inMultiDraw=false;//是不是多点拖动 , 为了单击事件
			//_click1Time=0;//第一次单击的时间 这个不能在这里操作 , 不然不会有双击
			_fingerNum=0;
		}
	}
	/*	END	还原单击 */
	
	
	/**
	 * 更新与此操作点相近的点
	 * 会不会有这种情况: 即更新A点, 又更新A点? 做出来才能观察
	 */
	function choseCloseOneAndUpdate(e){
		
		for(var i in e["changedTouches"]){
			//与_pin1的距离:
			var disA1=Math.abs(e["changedTouches"][i]["clientX"] - _pin1.currentX)*Math.abs(e["changedTouches"][i]["clientX"] - _pin1.currentX);
			var disA2=Math.abs(e["changedTouches"][i]["clientY"] - _pin1.currentY)*Math.abs(e["changedTouches"][i]["clientY"] - _pin1.currentY);
			var disA=disA1+disA2;
			
			if(isNaN(disA))return;
			
			var disB1=Math.abs(e["changedTouches"][i]["clientX"] - _pin2.currentX)*Math.abs(e["changedTouches"][i]["clientX"] - _pin2.currentX);
			var disB2=Math.abs(e["changedTouches"][i]["clientY"] - _pin2.currentY)*Math.abs(e["changedTouches"][i]["clientY"] - _pin2.currentY);
			var disB=disB1+disB2;
			
			
			if(disA < disB){//更新_pin1
				_pin1.currentX=e["changedTouches"][i]["clientX"];		
				_pin1.currentY=e["changedTouches"][i]["clientY"];
			}else{//更新_pin2
				_pin2.currentX=e["changedTouches"][i]["clientX"];		
				_pin2.currentY=e["changedTouches"][i]["clientY"];				
			}
		}
	}
	
	/**
	 * 根据两点位置,设置两点距离与两点间中心点
	 */
	function setDistanceAndCenter(){
		_pinCenterX=centerValue(_pin1.currentX,_pin2.currentX);
		_pinCenterY=centerValue(_pin1.currentY,_pin2.currentY);
		_pinOriginDistance =  Math.sqrt( Math.abs(_pin1.currentX-_pin2.currentX)*Math.abs(_pin1.currentX-_pin2.currentX) + Math.abs(_pin1.currentY-_pin2.currentY)*Math.abs(_pin1.currentY-_pin2.currentY) );
	}
	function centerValue(a,b){//反回两个值的中间值
		if(a > b){
			return (a - b)/2 + b;
		}else{
			return (b - a)/2 + a;
		}
		
	}
	/* END 两点距离与中间点 */
	
}

/**
 * 数字, 限制在一个区间内
 */
function numIn(num,a,b){
	num=(num < a ? a:num);
	return  num > b ? b: num;
}

// ----------------------	END		单绑定触控事件		------------------------------

