<template>
  <div>
    <button @click="showSingle">Show single picture.</button>
    <button @click="showMultiple">Show a group of pictures.</button>
    <br />
    <button @click="test">test1</button>
    <button @click="test2">test2</button>
    <button @click="show">test show</button>

    <vue-easy-lightbox
      :visible="visibleRef"
      :imgs="imgsRef"
      :index="indexRef"
      :pinchDisabled="pinchRef"
      :dblclickDisabled="false"
      :moveDisabled="false"
      :zoomScale="0.24"
      @hide="onHide"
      @on-index-change="onIndexChange"
      @on-rotate="onRotate"
    >
      <template #title="titleSlotProps">
        <div class="vel-img-title">{{ titleSlotProps.currentImg?.title }}</div>
      </template>
    </vue-easy-lightbox>
  </div>
</template>

<script lang="ts">
import { defineComponent, isReactive, ref } from 'vue'
import { useEasyLightbox } from '../composables'
import VueEasyLightbox from '../index'

export default defineComponent({
  components: {
    VueEasyLightbox
  },
  setup() {
    const imgList = ref([
      { src: 'http://via.placeholder.com/350x150', title: 'img1' },
      'http://via.placeholder.com/250x150'
    ])

    const { visibleRef, indexRef, imgsRef, show, changeIndex, onHide } =
      useEasyLightbox({
        imgs: imgList.value,
        initIndex: 0
      })

    const test = () => {
      console.log(isReactive(imgList.value))
      console.log(imgList.value)
      show()
    }
    const test2 = () => {
      imgList.value.push('http://via.placeholder.com/250x150')
      show()
    }

    const showSingle = () => {
      imgsRef.value = 'http://it-does-not-matter.png/'
      show()
    }
    const showMultiple = () => {
      imgsRef.value = [
        'https://loremipsum.imgix.net/gPyHKDGI0md4NkRDjs4k8/36be1e73008a0181c1980f727f29d002/avatar-placeholder-generator-500x500.jpg?w=1280&q=60&auto=format,compress',
        'https://loremipsum.imgix.net/oPtkn7DsBOsv8aitV1qns/1606c26302d81bab448e3a39581f86b5/lorem-flickr-1280x720.jpg?w=1280&q=60&auto=format,compress'
      ]
      changeIndex()
      show()
    }

    const onIndexChange = (old: number, newN: number) => {
      console.log(old, newN)
    }

    const onRotate = (deg: number) => {
      console.log(deg)
    }
    const pinchRef = ref(true)

    return {
      visibleRef,
      indexRef,
      imgsRef,
      showSingle,
      showMultiple,
      onHide,
      test,
      test2,
      onIndexChange,
      show,
      onRotate,
      pinchRef
    }
  }
})
</script>
