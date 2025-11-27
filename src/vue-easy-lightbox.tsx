import {
  defineComponent,
  PropType,
  nextTick,
  computed,
  ref,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  Transition,
  withModifiers,
  TeleportProps,
  Teleport
} from 'vue'

import { SvgIcon } from './components/svg-icon'
import { Toolbar } from './components/toolbar'
import { ImgLoading } from './components/img-loading'
import { ImgOnError } from './components/img-on-error'
import { ImgTitle } from './components/img-title'
import { DefaultIcons } from './components/default-icons'

import { prefixCls } from './constant'
import { on, off, isObject, isString, notEmpty, isArray } from './utils/index'
import { useImage, useMouse, useTouch } from './utils/hooks'
import { Img, IImgWrapperState, PropsImgs } from './types'

function isImg(arg: Img): arg is Img {
  return isObject(arg) && isString(arg.src)
}

export default defineComponent({
  name: 'VueEasyLightbox',
  props: {
    imgs: {
      type: [Array, String] as PropType<PropsImgs>,
      default: () => []
    },
    visible: {
      type: Boolean,
      default: false
    },
    index: {
      type: Number,
      default: 0
    },
    scrollDisabled: {
      type: Boolean,
      default: true
    },
    escDisabled: {
      type: Boolean,
      default: false
    },
    moveDisabled: {
      type: Boolean,
      default: false
    },
    titleDisabled: {
      type: Boolean,
      default: false
    },
    maskClosable: {
      type: Boolean,
      default: true
    },
    teleport: {
      type: [String, Object] as PropType<TeleportProps['to']>,
      default: null
    },
    swipeToleranceX: {
      type: Number,
      default: 50
    },
    swipeToleranceY: {
      type: Number,
      default: 50
    },
    loop: {
      type: Boolean,
      default: false
    },
    rtl: {
      type: Boolean,
      default: false
    },
    zoomScale: {
      type: Number,
      default: 0.12
    },
    maxZoom: {
      type: Number,
      default: 3
    },
    minZoom: {
      type: Number,
      default: 0.5
    },
    paginationDisabled: {
      type: Boolean,
      default: false
    },
    rotateDisabled: {
      type: Boolean,
      default: false
    },
    zoomDisabled: {
      type: Boolean,
      default: false
    },
    pinchDisabled: {
      type: Boolean,
      default: false
    },
    dblclickDisabled: {
      type: Boolean,
      default: false
    },
    isAlwaysShowNavigationBtn: {
      type: Boolean,
      default: false
    },
    isAlwaysShowPagination: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    hide: () => true,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'on-error': (e: Event) => true,
    'on-prev': (oldIndex: number, newIndex: number) => true,
    'on-next': (oldIndex: number, newIndex: number) => true,
    'on-prev-click': (oldIndex: number, newIndex: number) => true,
    'on-next-click': (oldIndex: number, newIndex: number) => true,
    'on-index-change': (oldIndex: number, newIndex: number) => true,
    'on-rotate': (deg: number) => true,
    'on-load': () => true
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit, slots }) {
    const { imgRef, imgState, setImgSize } = useImage()
    const imgIndex = ref(props.index)
    const lastBodyStyleOverflowY = ref('')

    const imgWrapperState = reactive<IImgWrapperState>({
      scale: 1,
      lastScale: 1,
      rotateDeg: 0,
      top: 0,
      left: 0,
      initX: 0,
      initY: 0,
      lastX: 0,
      lastY: 0,
      touches: [] as TouchList | []
    })

    const status = reactive({
      loadError: false,
      loading: false,
      dragging: false,
      gesturing: false,
      wheeling: false
    })

    const imgList = computed(() => {
      if (isArray(props.imgs)) {
        return props.imgs
          .map((img) => {
            if (typeof img === 'string') {
              return { src: img }
            } else if (isImg(img)) {
              return img
            }
          })
          .filter(notEmpty)
      } else if (isString(props.imgs)) {
        return [{ src: props.imgs }]
      }
      return []
    })

    const currentImg = computed(() => imgList.value[imgIndex.value])
    const currentImgSrc = computed(() => {
      return imgList.value[imgIndex.value]?.src
    })
    const currentImgTitle = computed(() => {
      return imgList.value[imgIndex.value]?.title
    })
    const currentImgAlt = computed(() => {
      return imgList.value[imgIndex.value]?.alt
    })

    const currCursor = () => {
      if (status.loadError) return 'default'

      if (props.moveDisabled) {
        return status.dragging ? 'grabbing' : 'grab'
      }

      return 'move'
    }

    const imgWrapperStyle = computed(() => {
      return {
        cursor: currCursor(),
        top: `calc(50% + ${imgWrapperState.top}px)`,
        left: `calc(50% + ${imgWrapperState.left}px)`,
        transition: status.dragging || status.gesturing ? 'none' : '',
        transform: `translate(-50%, -50%) scale(${imgWrapperState.scale}) rotate(${imgWrapperState.rotateDeg}deg)`
      }
    })

    const closeModal = () => {
      emit('hide')
    }

    const initImg = () => {
      imgWrapperState.scale = 1
      imgWrapperState.lastScale = 1
      imgWrapperState.rotateDeg = 0
      imgWrapperState.top = 0
      imgWrapperState.left = 0
      status.loadError = false
      status.dragging = false
      status.loading = currentImg.value.type === 'image'
    }

    const isResizeIn = computed(() => {
      return imgWrapperState.scale === 1
    })
    const zoomInDisabled = computed(() => {
      return imgWrapperState.scale + props.zoomScale > props.maxZoom
    })
    const zoomOutDisabled = computed(() => {
      return imgWrapperState.scale - props.zoomScale < props.minZoom
    })

    // switching imgs manually
    const changeIndex = (
      newIndex: number,
      emitsCallback?: (oldIdx: number, newIdx: number) => void
    ) => {
      const oldIndex = imgIndex.value

      initImg()

      imgIndex.value = newIndex

      // handle same Img
      if (imgList.value[imgIndex.value] === imgList.value[newIndex]) {
        nextTick(() => {
          status.loading = false
        })
      }

      // No emit event when hidden or same index
      if (!props.visible || oldIndex === newIndex) return

      if (emitsCallback) {
        emitsCallback(oldIndex, newIndex)
      }
      emit('on-index-change', oldIndex, newIndex)
    }

    const onNext = () => {
      const oldIndex = imgIndex.value
      const newIndex = props.loop
        ? (oldIndex + 1) % imgList.value.length
        : oldIndex + 1

      if (!props.loop && newIndex > imgList.value.length - 1) return

      changeIndex(newIndex, (oldIdx, newIdx) => {
        emit('on-next', oldIdx, newIdx)
        emit('on-next-click', oldIdx, newIdx)
      })
    }

    const onPrev = () => {
      const oldIndex = imgIndex.value
      let newIndex = oldIndex - 1

      if (oldIndex === 0) {
        if (!props.loop) return
        newIndex = imgList.value.length - 1
      }
      changeIndex(newIndex, (oldIdx, newIdx) => {
        emit('on-prev', oldIdx, newIdx)
        emit('on-prev-click', oldIdx, newIdx)
      })
    }

    // actions for changing img
    const zoom = (newScale: number) => {
      if (Math.abs(1 - newScale) < 0.05) {
        newScale = 1
      } else if (Math.abs(imgState.maxScale - newScale) < 0.05) {
        newScale = imgState.maxScale
      }
      imgWrapperState.lastScale = imgWrapperState.scale
      imgWrapperState.scale = newScale
    }

    const zoomIn = () => {
      const newScale = imgWrapperState.scale + props.zoomScale
      if (newScale <= props.maxZoom) {
        zoom(newScale)
      }
      // if (newScale < imgState.maxScale * props.maxZoom) {
      //   zoom(newScale)
      // }
    }

    const zoomOut = () => {
      const newScale = imgWrapperState.scale - props.zoomScale
      if (newScale >= props.minZoom) {
        zoom(newScale)
      }
    }

    const emitRotate = () => {
      const deg = imgWrapperState.rotateDeg % 360
      emit('on-rotate', Math.abs(deg < 0 ? deg + 360 : deg))
    }

    const emitLoad = () => {
      emit('on-load')
    }

    const rotateLeft = () => {
      imgWrapperState.rotateDeg -= 90
      emitRotate()
    }

    const rotateRight = () => {
      imgWrapperState.rotateDeg += 90
      emitRotate()
    }

    const resize = () => {
      if (imgWrapperState.scale === 1) {
        imgWrapperState.scale = props.maxZoom
        imgWrapperState.top = 0
        imgWrapperState.left = 0
      } else {
        imgWrapperState.scale = 1
        imgWrapperState.top = 0
        imgWrapperState.left = 0
      }
    }

    // check img moveable
    const canMove = (button = 0) => {
      if (props.moveDisabled) return false
      // mouse left btn click
      return button === 0
    }

    // mouse

    const canMoveX = (dx = 0) => {
      // Можно двигать по X, если видимая ширина изображения больше ширины модального окна
      const { w: vw } = getViewportSize()
      const { w: iw } = getDisplayedImageSize()

      // Если изображение целиком вмещается по ширине — двигать нельзя
      if (iw <= vw) return false

      // Предельные смещения
      const minLeft = -Math.max(0, (iw - vw) / 2)
      const maxLeft = Math.max(0, (iw - vw) / 2)

      const nextLeft = imgWrapperState.left + dx

      // Если dx не задан (например, запросили просто “в принципе можно ли двигать по X?”),
      // то возвращаем true, так как есть запас (iw > vw).
      if (dx === 0) return true

      // Двигать влево (dx < 0) можно, пока не достигли левого предела
      if (dx < 0) return nextLeft >= minLeft

      // Двигать вправо (dx > 0) можно, пока не достигли правого предела
      if (dx > 0) return nextLeft <= maxLeft

      return true
    }

    const canMoveY = (dy = 0) => {
      // Можно двигать по Y, если видимая высота изображения больше высоты модального окна
      const { h: vh } = getViewportSize()
      const { h: ih } = getDisplayedImageSize()

      // Если изображение целиком вмещается по высоте — двигать нельзя
      if (ih <= vh) return false

      // Предельные смещения
      const minTop = -Math.max(0, (ih - vh) / 2)
      const maxTop = Math.max(0, (ih - vh) / 2)

      const nextTop = imgWrapperState.top + dy

      if (dy === 0) return true

      // Двигать вверх (dy < 0) можно, пока не достигли верхнего предела
      if (dy < 0) return nextTop >= minTop

      // Двигать вниз (dy > 0) можно, пока не достигли нижнего предела
      if (dy > 0) return nextTop <= maxTop

      return true
    }

    const {
      onMouseDown,
      onMouseMove: _onMouseMove,
      onMouseUp: _onMouseUp
    } = useMouse(imgWrapperState, status, canMove, canMoveX, canMoveY)

    const onMouseUp = (e: MouseEvent) => {
      _onMouseUp(e)
      clampPosition()
      // maybeSwitchOnDragEnd()
    }

    const onMouseMove = (e: MouseEvent) => {
      _onMouseMove(e)
      clampPosition()
      // maybeSwitchOnDragEnd()
    }

    const {
      onTouchStart,
      onTouchMove: _onTouchMove,
      onTouchEnd: _onTouchEnd
    } = useTouch(
      imgState,
      imgWrapperState,
      status,
      canMove,
      () => !props.pinchDisabled,
      canMoveX,
      canMoveY
    )

    const onTouchEnd = () => {
      _onTouchEnd()
      clampPosition()
      // maybeSwitchOnDragEnd()
    }

    const onTouchMove = (e: TouchEvent) => {
      _onTouchMove(e)
      clampPosition()
      // maybeSwitchOnDragEnd()
    }

    const onDblclick = () => {
      if (props.dblclickDisabled) return

      if (imgWrapperState.scale !== props.maxZoom) {
        imgWrapperState.lastScale = imgWrapperState.scale
        imgWrapperState.scale = props.maxZoom
      } else {
        imgWrapperState.scale = imgWrapperState.lastScale
      }
      clampPosition()
    }

    const onWheel = (e: WheelEvent) => {
      if (
        status.loadError ||
        status.gesturing ||
        status.loading ||
        status.dragging ||
        status.wheeling ||
        !props.scrollDisabled ||
        props.zoomDisabled
      ) {
        return
      }

      status.wheeling = true

      setTimeout(() => {
        status.wheeling = false
      }, 80)

      const step = props.zoomScale
      const direction = e.deltaY < 0 ? 1 : -1
      const targetScale = imgWrapperState.scale + direction * step

      zoomAroundPoint(targetScale, e.clientX, e.clientY)
    }

    // key press events handler
    const onKeyPress = (e: Event) => {
      const evt = e as KeyboardEvent

      if (!props.visible) return

      if (!props.escDisabled && evt.key === 'Escape' && props.visible) {
        closeModal()
      }
      if (evt.key === 'ArrowLeft') {
        props.rtl ? onNext() : onPrev()
      }
      if (evt.key === 'ArrowRight') {
        props.rtl ? onPrev() : onNext()
      }
    }

    const onMaskClick = () => {
      if (props.maskClosable) {
        closeModal()
      }
    }

    // handle loading process
    const onImgLoad = () => {
      setImgSize()
      emitLoad()
    }

    const onTestImgLoad = () => {
      status.loading = false
    }

    const onTestImgError = (e: Event) => {
      status.loading = false
      status.loadError = true
      emit('on-error', e)
    }

    const onWindowResize = () => {
      if (!props.visible) return
      setImgSize()
    }

    watch(
      () => props.index,
      (newIndex) => {
        if (newIndex < 0 || newIndex >= imgList.value.length) {
          return
        }
        changeIndex(newIndex)
      }
    )

    const canShiftFurtherX = (dx: number) => {
      const { w: vw } = getViewportSize()
      const { w: iw } = getDisplayedImageSize()

      if (iw <= vw) {
        return false
      }

      const minLeft = -Math.max(0, (iw - vw) / 2)
      const maxLeft = Math.max(0, (iw - vw) / 2)

      const nextLeft = imgWrapperState.left + dx

      if (dx < 0) {
        return nextLeft > minLeft
      } else if (dx > 0) {
        return nextLeft < maxLeft
      }
      return true
    }

    const maybeSwitchOnDragEnd = () => {
      const tolerance = props.swipeToleranceX
      const xDiff = imgWrapperState.lastX - imgWrapperState.initX

      const yDiff = imgWrapperState.lastY - imgWrapperState.initY

      const movedHorizontally = Math.abs(xDiff) > Math.abs(yDiff)
      if (!movedHorizontally) return

      const wantsNext = xDiff < -tolerance
      const wantsPrev = xDiff > tolerance
      if (!wantsNext && !wantsPrev) return

      const dx = wantsNext ? -1 : 1
      const stillCanShift = canShiftFurtherX(dx)

      // console.log('maybeSwitchOnDragEnd', 'EMIT')

      if (!stillCanShift) {
        if (wantsNext) onNext()
        else if (wantsPrev) onPrev()
      }
    }

    watch(
      () => status.dragging,
      (newStatus, oldStatus) => {
        const dragged = !newStatus && oldStatus
        if (dragged) {
          const xDiff = imgWrapperState.lastX - imgWrapperState.initX
          const yDiff = imgWrapperState.lastY - imgWrapperState.initY

          const toleranceX = props.swipeToleranceX
          const toleranceY = props.swipeToleranceY
          const movedHorizontally = Math.abs(xDiff) > Math.abs(yDiff)

          const movedVertically = Math.abs(yDiff) > Math.abs(xDiff)

          if (
            movedHorizontally &&
            (xDiff < toleranceX * -1 || xDiff > toleranceX)
          ) {
            console.log('мыфТУТ')
            // if (xDiff < toleranceX * -1) onNext()
            // else if (xDiff > toleranceX) onPrev()
            maybeSwitchOnDragEnd()
          } else if (
            movedVertically &&
            (yDiff > toleranceY || yDiff < toleranceY * -1)
          ) {
            closeModal()
          }
        }
      }
    )

    // init
    watch(
      () => props.visible,
      (visible) => {
        if (visible) {
          initImg()
          const len = imgList.value.length
          if (len === 0) {
            imgIndex.value = 0
            status.loading = false
            nextTick(() => (status.loadError = true))
            return
          }
          imgIndex.value =
            props.index >= len ? len - 1 : props.index < 0 ? 0 : props.index

          if (props.scrollDisabled) {
            disableScrolling()
          }
        } else {
          if (props.scrollDisabled) {
            enableScrolling()
          }
        }
      }
    )

    const getViewportSize = () => {
      const el = document.querySelector(`.vel-modal`) as HTMLElement | null
      if (!el) return { w: window.innerWidth, h: window.innerHeight }
      const rect = el.getBoundingClientRect()
      return { w: rect.width, h: rect.height }
    }

    const getDisplayedImageSize = () => {
      const iw = imgState.width
      const ih = imgState.height
      const scale = imgWrapperState.scale
      // const rad = (imgWrapperState.rotateDeg % 180 === 0 ? 0 : Math.PI / 2)
      if (Math.abs(imgWrapperState.rotateDeg % 180) === 90) {
        return { w: ih * scale, h: iw * scale }
      }
      return { w: iw * scale, h: ih * scale }
    }

    const clampPosition = () => {
      const { w: vw, h: vh } = getViewportSize()
      const { w: iw, h: ih } = getDisplayedImageSize()

      // const maxOffsetX = Math.max(0, (vw - iw) / 2)
      // const maxOffsetY = Math.max(0, (vh - ih) / 2)

      const minLeft = -Math.max(0, (iw - vw) / 2)
      const maxLeft = Math.max(0, (iw - vw) / 2)
      const minTop = -Math.max(0, (ih - vh) / 2)
      const maxTop = Math.max(0, (ih - vh) / 2)

      const clampedLeft = Math.min(
        maxLeft,
        Math.max(minLeft, imgWrapperState.left)
      )
      const clampedTop = Math.min(maxTop, Math.max(minTop, imgWrapperState.top))

      imgWrapperState.left = clampedLeft
      imgWrapperState.top = clampedTop
    }

    const getImageCenterOnScreen = () => {
      const { w: vw, h: vh } = getViewportSize()
      return {
        cx: vw / 2 + imgWrapperState.left,
        cy: vh / 2 + imgWrapperState.top
      }
    }

    const screenToImage = (clientX: number, clientY: number) => {
      const { cx, cy } = getImageCenterOnScreen()
      const { w, h } = getDisplayedImageSize()

      const dx = clientX - cx
      const dy = clientY - cy

      const theta = ((imgWrapperState.rotateDeg % 360) * Math.PI) / 180
      const cos = Math.cos(-theta)
      const sin = Math.sin(-theta)
      const rx = dx * cos - dy * sin
      const ry = dx * sin + dy * cos

      const localX = rx + w / 2
      const localY = ry + h / 2
      return { x: localX, y: localY }
    }

    const imageToScreen = (localX: number, localY: number) => {
      const { cx, cy } = getImageCenterOnScreen()
      const { w, h } = getDisplayedImageSize()

      const rx = localX - w / 2
      const ry = localY - h / 2

      const theta = ((imgWrapperState.rotateDeg % 360) * Math.PI) / 180
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)

      const dx = rx * cos - ry * sin
      const dy = rx * sin + ry * cos

      return { x: cx + dx, y: cy + dy }
    }

    const zoomAroundPoint = (newScale: number, fx: number, fy: number) => {
      if (Math.abs(1 - newScale) < 0.5) newScale = 1
      else if (Math.abs(imgState.maxScale - newScale) < 0.5)
        newScale = imgState.maxScale

      const before = screenToImage(fx, fy)

      const prevScale = imgWrapperState.scale
      imgWrapperState.lastScale = prevScale

      const maxAllowed = props.maxZoom
      const minAllowed = props.minZoom
      newScale = Math.min(Math.max(newScale, minAllowed), maxAllowed)

      imgWrapperState.scale = newScale

      const afterScreen = imageToScreen(
        before.x * (newScale / prevScale),
        before.y * (newScale / prevScale)
      )

      const dx = fx - afterScreen.x
      const dy = fy - afterScreen.y
      imgWrapperState.left += dx
      imgWrapperState.top += dy

      clampPosition()
    }

    const disableScrolling = () => {
      if (!document) return
      lastBodyStyleOverflowY.value = document.body.style.overflowY
      document.body.style.overflowY = 'hidden'
    }

    const enableScrolling = () => {
      if (!document) return
      document.body.style.overflowY = lastBodyStyleOverflowY.value
    }

    onMounted(() => {
      on(document, 'keydown', onKeyPress)
      on(window, 'mouseup', onMouseUp)
      on(window, 'mouseleave', onMouseUp)
      on(window, 'touchend', onTouchEnd)
      on(window, 'touchcancel', onTouchEnd)
      on(window, 'blur', onMouseUp)
      on(window, 'resize', onWindowResize)
    })

    onBeforeUnmount(() => {
      off(document, 'keydown', onKeyPress)
      off(window, 'mouseup', onMouseUp)
      off(window, 'mouseleave', onMouseUp)
      off(window, 'touchend', onTouchEnd)
      off(window, 'touchcancel', onTouchEnd)
      off(window, 'blur', onMouseUp)
      off(window, 'resize', onWindowResize)
      if (props.scrollDisabled) {
        enableScrolling()
      }
    })

    const renderLoading = () => {
      return slots.loading ? (
        slots.loading({
          key: 'loading'
        })
      ) : (
        <ImgLoading key="img-loading" />
      )
    }
    const renderOnError = () => {
      return slots.onerror ? (
        slots.onerror({
          key: 'onerror'
        })
      ) : (
        <ImgOnError key="img-on-error" />
      )
    }

    const renderImgWrapper = () => {
      if (currentImg.value?.type === 'image') {
        return (
          <div
            class={`${prefixCls}-img-wrapper`}
            style={imgWrapperStyle.value}
            key="img-wrapper"
          >
            <img
              alt={currentImgAlt.value}
              ref={imgRef}
              draggable="false"
              class={`${prefixCls}-img`}
              src={currentImgSrc.value}
              onMousedown={onMouseDown}
              onMouseup={onMouseUp}
              onMousemove={onMouseMove}
              onTouchstart={onTouchStart}
              onTouchmove={onTouchMove}
              onTouchend={onTouchEnd}
              onLoad={onImgLoad}
              onDblclick={onDblclick}
              onDbltap={onDblclick}
              onDragstart={(e) => {
                e.preventDefault()
              }}
            />
          </div>
        )
      } else if (currentImg.value?.type === 'video') {
        // return slots['video']
        return (
          <div
            class={`${prefixCls}-img-wrapper`}
            style={imgWrapperStyle.value}
            key="img-wrapper"
          >
            <video
              alt={currentImgAlt.value}
              ref={imgRef}
              draggable="false"
              class={`${prefixCls}-img tc-easy-lightbox-video`}
              src={`${currentImgSrc.value}#t=0.005`}
              onMousedown={onMouseDown}
              onMouseup={onMouseUp}
              onMousemove={onMouseMove}
              onTouchstart={onTouchStart}
              onTouchmove={onTouchMove}
              onTouchend={onTouchEnd}
              onLoad={onImgLoad}
              onDblclick={onDblclick}
              onDragstart={(e) => {
                e.preventDefault()
              }}
              controls
              playsinline
              preload="metadata"
            />
          </div>
        )
      }
    }

    const renderWrapper = () => {
      if (currentImg.value?.type === 'image') {
        if (status.loading) {
          return renderLoading()
        } else if (status.loadError) {
          return renderOnError()
        }
      }
      return renderImgWrapper()
    }

    const renderTestImg = () => (
      <img
        style="display:none;"
        src={currentImgSrc.value}
        onError={onTestImgError}
        onLoad={onTestImgLoad}
      />
    )

    const renderPrevBtn = () => {
      if (slots['prev-btn']) {
        return slots['prev-btn']({
          prev: onPrev
        })
      }

      if (!props.isAlwaysShowNavigationBtn) {
        if (imgList.value.length <= 1) return
      }

      const isDisabled = !props.loop && imgIndex.value <= 0

      return (
        <div
          role="button"
          aria-label="previous image button"
          class={`btn__prev ${isDisabled ? 'disable' : ''}`}
          onClick={onPrev}
        >
          {props.rtl ? <SvgIcon type="next" /> : <SvgIcon type="prev" />}
        </div>
      )
    }

    const renderNextBtn = () => {
      if (slots['next-btn']) {
        return slots['next-btn']({
          next: onNext
        })
      }
      if (!props.isAlwaysShowNavigationBtn) {
        if (imgList.value.length <= 1) return
      }

      const isDisabled =
        !props.loop && imgIndex.value >= imgList.value.length - 1

      return (
        <div
          role="button"
          aria-label="next image button"
          class={`btn__next ${isDisabled ? 'disable' : ''}`}
          onClick={onNext}
        >
          {props.rtl ? <SvgIcon type="prev" /> : <SvgIcon type="next" />}
        </div>
      )
    }

    const renderCloseBtn = () => {
      return slots['close-btn'] ? (
        slots['close-btn']({
          close: closeModal
        })
      ) : (
        <div
          role="button"
          aria-label="close image preview button"
          class={`btn__close`}
          onClick={closeModal}
        >
          <SvgIcon type="close" />
        </div>
      )
    }

    const renderToolbar = () => {
      return slots.toolbar ? (
        slots.toolbar({
          toolbarMethods: {
            zoomIn,
            zoomOut,
            rotate: rotateLeft,
            rotateLeft,
            rotateRight,
            resize
          },
          zoomIn,
          zoomOut,
          rotate: rotateLeft,
          rotateLeft,
          rotateRight,
          resize
        })
      ) : (
        <Toolbar
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resize={resize}
          isResizeIn={isResizeIn.value}
          rotateLeft={rotateLeft}
          rotateRight={rotateRight}
          rotateDisabled={props.rotateDisabled}
          zoomDisabled={props.zoomDisabled}
          zoomInDisabled={zoomInDisabled.value}
          zoomOutDisabled={zoomOutDisabled.value}
        />
      )
    }
    const renderImgTitle = () => {
      if (props.titleDisabled || status.loading || status.loadError) {
        return
      }

      if (slots.title) {
        return slots.title({
          currentImg: currentImg.value
        })
      }

      if (currentImgTitle.value) {
        return <ImgTitle>{currentImgTitle.value}</ImgTitle>
      }

      return
    }

    const renderPagination = () => {
      if (props.paginationDisabled) return

      if (!props.isAlwaysShowPagination) {
        if (imgList.value.length <= 1) return
      }
      return (
        <div class={`${prefixCls}-pagination`}>
          {imgList.value.map((_, i) => {
            const isActive = i === imgIndex.value
            // const isDisabled =
            //   !props.loop && (i === imgIndex.value ||
            //     (imgIndex.value === 0 && i < 0) ||
            //     (imgIndex.value === imgList.value.length - 1 && i > imgList.value.length - 1))

            return (
              <button
                key={`vel-bullet-${i}`}
                type="button"
                class={[
                  `${prefixCls}-bullet`,
                  isActive ? 'is-active' : ''
                ].join(' ')}
                aria-label={`Go to item ${i + 1}`}
                aria-current={isActive ? 'true' : 'false'}
                onClick={(e) => {
                  e.stopPropagation()
                  changeIndex(i)
                }}
              />
            )
          })}
        </div>
      )
    }

    const renderModal = () => {
      if (!props.visible) {
        return
      }

      return (
        <div
          onTouchmove={onTouchMove}
          class={[`${prefixCls}-modal`, props.rtl ? 'is-rtl' : '']}
          onClick={withModifiers(onMaskClick, ['self'])}
          onDblclick={withModifiers(onDblclick, ['self'])}
          onMousedown={onMouseDown}
          onMouseup={onMouseUp}
          onMousemove={onMouseMove}
          onTouchstart={onTouchStart}
          onTouchend={onTouchEnd}
          onWheel={onWheel}
        >
          <DefaultIcons />
          <Transition
            name={`${prefixCls}-fade`}
            mode="out-in"
          >
            {renderWrapper()}
          </Transition>
          {renderTestImg()}
          <div class={`${prefixCls}-btns-wrapper`}>
            {renderPrevBtn()}
            {renderNextBtn()}
            {renderImgTitle()}
            {renderCloseBtn()}
            {renderPagination()}
            {renderToolbar()}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style="display:none"
          >
            <symbol
              id="zoomin"
              viewBox="0 0 32 32"
            >
              <path
                d="M16.0026 26.6666C21.8936 26.6666 26.6693 21.891 26.6693 15.9999C26.6693 10.1089 21.8936 5.33325 16.0026 5.33325C10.1116 5.33325 5.33594 10.1089 5.33594 15.9999C5.33594 21.891 10.1116 26.6666 16.0026 26.6666Z"
                stroke="currentColor"
                stroke-width="2.13333"
                stroke-miterlimit="10"
              />
              <path
                d="M21.25 16L10.75 16"
                stroke="currentColor"
                stroke-width="2.13333"
                stroke-miterlimit="10"
              />
              <path
                d="M16 21.25L16 10.75"
                stroke="currentColor"
                stroke-width="2.13333"
                stroke-miterlimit="10"
              />
            </symbol>
            <symbol
              id="zoomout"
              viewBox="0 0 32 32"
            >
              <path
                d="M16.0026 26.6666C21.8936 26.6666 26.6693 21.891 26.6693 15.9999C26.6693 10.1089 21.8936 5.33325 16.0026 5.33325C10.1116 5.33325 5.33594 10.1089 5.33594 15.9999C5.33594 21.891 10.1116 26.6666 16.0026 26.6666Z"
                stroke="currentColor"
                stroke-opacity="0.5"
                stroke-width="2.13333"
                stroke-miterlimit="10"
              />
              <path
                d="M21.25 16L10.75 16"
                stroke="currentColor"
                stroke-opacity="0.5"
                stroke-width="2.13333"
                stroke-miterlimit="10"
              />
            </symbol>
            <symbol
              id="resize"
              viewBox="0 0 54 54"
            >
              <path
                d="M16.6692 25.2727L16.6178 36.6378M16.6178 36.6378L27.9829 36.5864M16.6178 36.6378L29.6993 23.5563"
                stroke="currentColor"
                stroke-width="2.135"
              />
              <path
                d="M25.2722 16.6685L36.6373 16.6171M36.6373 16.6171L36.5859 27.9822M36.6373 16.6171L23.5558 29.6985"
                stroke="currentColor"
                stroke-width="2.135"
              />
            </symbol>
            <symbol
              id="icon-resizeout"
              viewBox="0 0 62 62"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M28.5847 43.9822L28.6361 32.6171M28.6361 32.6171L17.271 32.6685M28.6361 32.6171L15.5546 45.6985"
                stroke="currentColor"
                stroke-width="2.135"
              />
              <path
                d="M43.9817 28.5864L32.6166 28.6378M32.6166 28.6378L32.668 17.2727M32.6166 28.6378L45.6981 15.5563"
                stroke="currentColor"
                stroke-width="2.135"
              />
            </symbol>
          </svg>
        </div>
      )
    }

    return () => {
      if (props.teleport) {
        return (
          <Teleport to={props.teleport}>
            <Transition name={`${prefixCls}-fade`}>{renderModal()}</Transition>
          </Teleport>
        )
      }

      return <Transition name={`${prefixCls}-fade`}>{renderModal()}</Transition>
    }
  }
})
