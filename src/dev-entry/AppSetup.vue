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
      :zoomScale="0.5"
      @hide="onHide"
      @on-index-change="onIndexChange"
      @on-rotate="onRotate"
    >
      <template #title="titleSlotProps">
        <div class="vel-img-title">{{ titleSlotProps.currentImg?.title }}</div>
      </template>
      <template #video>
        <div class="w-full pt-[87.87%]">
          <video
            :src="`${imgsRef?.[indexRef]?.url}#t=0.005`"
            class="absolute top-0 left-0 w-full h-full"
            controls
            playsinline
            preload="metadata"
          />
        </div>
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
        {
          title: "img's url: https://i.loli.net/2018/11/10/5be6852cdb002.jpeg",
          src: 'https://loremipsum.imgix.net/gPyHKDGI0md4NkRDjs4k8/36be1e73008a0181c1980f727f29d002/avatar-placeholder-generator-500x500.jpg?w=1280&q=60&auto=format,compress',
          type: 'image'
        },
        {
          title: "There is img's description",
          src: 'https://loremipsum.imgix.net/oPtkn7DsBOsv8aitV1qns/1606c26302d81bab448e3a39581f86b5/lorem-flickr-1280x720.jpg?w=1280&q=60&auto=format,compress',
          type: 'image'
        },
        {
          title: 'VIDEO',
          src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0.005',
          type: 'video'
        },
        {
          title: "There is img's description",
          src: 'https://loremipsum.imgix.net/oPtkn7DsBOsv8aitV1qns/1606c26302d81bab448e3a39581f86b5/lorem-flickr-1280x720.jpg?w=1280&q=60&auto=format,compress',
          type: 'image'
        }
      ]
      changeIndex()
      show()
    }

    const onIndexChange = (old: number, newN: number) => {
      console.log('onIndexChange 111', old, newN)
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
