import { CommonModule } from "@angular/common"
import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener } from "@angular/core"

@Component({
  selector: "app-video-player",
  imports: [CommonModule],
  templateUrl: "./video-player.component.html",
  styleUrls: ["./video-player.component.scss"],
})
export class VideoPlayerComponent implements OnInit, AfterViewInit {
  @ViewChild("videoElement") videoElement!: ElementRef<HTMLVideoElement>
  @ViewChild("videoContainer") videoContainer!: ElementRef<HTMLDivElement>
  @ViewChild("currentTime") currentTime!: ElementRef<HTMLDivElement>
  @ViewChild("duration") duration!: ElementRef<HTMLDivElement>
  @ViewChild("buffer") buffer!: ElementRef<HTMLDivElement>
  @ViewChild("currentVol") currentVol!: ElementRef<HTMLDivElement>
  @ViewChild("totalVol") totalVol!: ElementRef<HTMLDivElement>
  @ViewChild("controls") controls!: ElementRef<HTMLDivElement>
  @ViewChild("hoverTime") hoverTime!: ElementRef<HTMLDivElement>
  @ViewChild("hoverDuration") hoverDuration!: ElementRef<HTMLSpanElement>
  @ViewChild("settingMenu") settingMenu!: ElementRef<HTMLUListElement>
  @ViewChild("mainState") mainState!: ElementRef<HTMLSpanElement>

  isPlaying = false;
  mouseDownProgress = false;
  mouseDownVol = false;
  isCursorOnControls = false;
  muted = false;
  timeout: any;
  volumeVal = 1;
  mouseOverDuration = false;
  touchClientX = 0;
  touchPastDurationWidth = 0;
  touchStartTime = 0;
  totalDurationText = "00:00";
  currentDurationText = "00:00";
  isFullscreen = false;
  isTheater = false;
  isPictureInPicture = false;
  isLoading = false;
  playbackRate = 1;
  doubleTapDelay = 300;
  lastTap = 0;
  skipAmount = 10;
  showForwardIndicator = false;
  showBackwardIndicator = false;
  forwardTimeout: any;
  backwardTimeout: any;
  lastTapPosition = "";
  private singleTapTimeout: any;
  private isTapPending = false;
  private videoTouchStartX = 0;

  constructor() { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.currentVol.nativeElement.style.width = this.volumeVal * 100 + "%"
    this.videoElement.nativeElement.addEventListener("loadedmetadata", () => this.canPlayInit());
    this.videoElement.nativeElement.addEventListener("play", () => this.play());
    this.videoElement.nativeElement.addEventListener("pause", () => this.pause());
    this.videoElement.nativeElement.addEventListener("progress", () => this.handleProgress());
    this.videoElement.nativeElement.addEventListener("timeupdate", () => this.handleProgressBar());
    this.videoElement.nativeElement.addEventListener("waiting", () => (this.isLoading = true));
    this.videoElement.nativeElement.addEventListener("playing", () => (this.isLoading = false));
  }

  canPlayInit(): void {
    this.totalDurationText = this.showDuration(this.videoElement.nativeElement.duration);
    this.videoElement.nativeElement.volume = this.volumeVal;
    this.muted = this.videoElement.nativeElement.muted;
    if (this.videoElement.nativeElement.paused) {
      this.controls.nativeElement.classList.add("show-controls");
      this.mainState.nativeElement.classList.add("show-state");
      this.handleMainStateIcon('<i class="fa-solid fa-play"></i>');
    }
  }

  play(): void {
    this.videoElement.nativeElement.play();
    this.isPlaying = true;
    this.mainState.nativeElement.classList.remove("show-state");
    this.settingMenu.nativeElement.classList.remove('show-setting-menu');
    this.handleMainStateIcon('<i class="fa-solid fa-pause"></i>');
  }

  pause(): void {
    this.videoElement.nativeElement.pause();
    this.isPlaying = false;
    this.controls.nativeElement.classList.add("show-controls");
    this.mainState.nativeElement.classList.add("show-state");
    this.handleMainStateIcon('<i class="fa-solid fa-play"></i>')
    if (this.videoElement.nativeElement.ended) {
      this.currentTime.nativeElement.style.width = "100%";
    }
  }

  isEventPathIncludesControls(event: MouseEvent): boolean {
    let element: HTMLElement | null = event.target as HTMLElement
    while (element) {
      if (element.classList && element.classList.contains("controls")) {
        return true
      }
      element = element.parentElement;
    }
    return false
  }

  handleProgressBar(): void {
    const video = this.videoElement.nativeElement
    this.currentTime.nativeElement.style.width = (video.currentTime / video.duration) * 100 + "%"
    this.currentDurationText = this.showDuration(video.currentTime)
  }

  navigate(e: MouseEvent): void {
    const totalDurationRect = this.duration.nativeElement.getBoundingClientRect()
    const width = Math.min(Math.max(0, e.clientX - totalDurationRect.x), totalDurationRect.width)
    this.currentTime.nativeElement.style.width = (width / totalDurationRect.width) * 100 + "%"
    this.videoElement.nativeElement.currentTime =
      (width / totalDurationRect.width) * this.videoElement.nativeElement.duration
  }

  showDuration(time: number): string {
    const hours = Math.floor(time / 60 ** 2)
    const min = Math.floor((time / 60) % 60)
    const sec = Math.floor(time % 60)
    if (hours > 0) {
      return `${this.formatter(hours)}:${this.formatter(min)}:${this.formatter(sec)}`
    } else {
      return `${this.formatter(min)}:${this.formatter(sec)}`
    }
  }

  formatter(number: number): string {
    return new Intl.NumberFormat(undefined, { minimumIntegerDigits: 2 }).format(number)
  }

  toggleMuteUnmute(): void {
    if (!this.muted) {
      this.videoElement.nativeElement.volume = 0
      this.muted = true
      // this.totalVol.nativeElement.classList.remove("show")
      this.handleMainStateIcon('<i class="pi pi-volume-off"></i>')
    } else {
      this.videoElement.nativeElement.volume = this.volumeVal
      this.muted = false
      this.totalVol.nativeElement.classList.add("show")
      this.handleMainStateIcon('<i class="pi pi-volume-up"></i>')
    }
  }

  hideControls(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    this.timeout = setTimeout(() => {
      if (this.isPlaying && !this.isCursorOnControls) {
        this.controls.nativeElement.classList.remove("show-controls")
        this.settingMenu.nativeElement.classList.remove("show-setting-menu")
      }
    }, 1000)
  }

  handleVolume(e: MouseEvent): void {
    const totalVolRect = this.totalVol.nativeElement.getBoundingClientRect()
    this.currentVol.nativeElement.style.width =
      Math.min(Math.max(0, e.clientX - totalVolRect.x), totalVolRect.width) + "px"
    this.volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width), 1)
    this.videoElement.nativeElement.volume = this.volumeVal;
    if (this.volumeVal === 0) {
      this.muted = true;
      this.handleMainStateIcon('<i class="pi pi-volume-off"></i>');
    }
  }

  handleProgress(): void {
    const video = this.videoElement.nativeElement
    if (!video.buffered || !video.buffered.length) {
      return
    }
    const width = (video.buffered.end(0) / video.duration) * 100 + "%"
    this.buffer.nativeElement.style.width = width
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.videoContainer.nativeElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
      this.isFullscreen = true
      this.handleMainStateIcon('<i class="fa-solid fa-expand"></i>')
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`)
      })
      this.isFullscreen = false
      this.handleMainStateIcon('<i class="fa-solid fa-compress"></i>')

      setTimeout(() => {
        this.videoContainer.nativeElement.style.position = "relative"
        this.videoContainer.nativeElement.style.width = "1024px"
        this.videoContainer.nativeElement.style.height = "calc((9 / 16) * 1024px)"
      }, 100)
    }
  }

  @HostListener("document:mousemove", ["$event"])
  handleMousemove(e: MouseEvent): void {
    if (this.mouseDownProgress) {
      e.preventDefault()
      this.navigate(e)
    }
    if (this.mouseDownVol) {
      this.handleVolume(e)
    }
    if (this.mouseOverDuration) {
      const rect = this.duration.nativeElement.getBoundingClientRect()
      const width = Math.min(Math.max(0, e.clientX - rect.x), rect.width)
      const percent = (width / rect.width) * 100
      this.hoverTime.nativeElement.style.width = width + "px"
      this.hoverDuration.nativeElement.innerHTML = this.showDuration(
        (this.videoElement.nativeElement.duration / 100) * percent,
      )
    }
  }

  @HostListener("document:mouseup")
  onMouseUp(): void {
    this.mouseDownProgress = false
    this.mouseDownVol = false
  }

  onMouseDownProgress(e: MouseEvent): void {
    this.mouseDownProgress = true
    this.navigate(e)
  }

  onMouseDownVol(e: MouseEvent): void {
    this.mouseDownVol = true
    this.handleVolume(e)
  }

  onMouseEnterDuration(): void {
    this.mouseOverDuration = true
  }

  onMouseLeaveDuration(): void {
    this.mouseOverDuration = false
    this.hoverTime.nativeElement.style.width = "0"
    this.hoverDuration.nativeElement.innerHTML = ""
  }

  onMouseEnterControls(): void {
    this.controls.nativeElement.classList.add("show-controls")
    this.isCursorOnControls = true
  }

  onMouseLeaveControls(): void {
    this.isCursorOnControls = false
  }

  onMouseEnterMuteUnmute(): void {
    if (!this.muted) {
      this.totalVol.nativeElement.classList.add("show")
    } else {
      // this.totalVol.nativeElement.classList.remove("show")
    }
  }

  onMouseLeaveMuteUnmute(e: MouseEvent): void {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !relatedTarget.classList.contains("volume")) {
      // this.totalVol.nativeElement.classList.remove("show")
    }
  }

  onMouseEnterVideoContainer(): void {
    this.controls.nativeElement.classList.add("show-controls")
  }

  onMouseLeaveVideoContainer(): void {
    this.hideControls()
  }

  onMouseMoveVideoContainer(): void {
    this.controls.nativeElement.classList.add("show-controls")
    this.hideControls()
  }

  onTouchStartVideoContainer(e: TouchEvent): void {
    this.controls.nativeElement.classList.add("show-controls")
    this.touchClientX = e.changedTouches[0].clientX
    const currentTimeRect = this.currentTime.nativeElement.getBoundingClientRect()
    this.touchPastDurationWidth = currentTimeRect.width
    this.touchStartTime = e.timeStamp
  }

  onTouchEndVideoContainer(): void {
    this.hideControls()
    this.touchClientX = 0
    this.touchPastDurationWidth = 0
    this.touchStartTime = 0
  }

  onTouchMoveVideoContainer(e: TouchEvent): void {
    this.hideControls()
    if (e.timeStamp - this.touchStartTime > 500) {
      const durationRect = this.duration.nativeElement.getBoundingClientRect()
      const clientX = e.changedTouches[0].clientX
      const value = Math.min(
        Math.max(0, this.touchPastDurationWidth + (clientX - this.touchClientX) * 0.2),
        durationRect.width,
      )
      this.currentTime.nativeElement.style.width = value + "px"
      this.videoElement.nativeElement.currentTime =
        (value / durationRect.width) * this.videoElement.nativeElement.duration
      this.currentDurationText = this.showDuration(this.videoElement.nativeElement.currentTime)
    }
  }

  handleForward(): void {
    const skipAmount = this.skipAmount
    this.videoElement.nativeElement.currentTime += skipAmount
    this.handleProgressBar()
    this.handleMainStateIcon('<i class="fa-solid fa-forward"></i>')

    this.showForwardIndicator = true

    if (this.forwardTimeout) {
      clearTimeout(this.forwardTimeout)
    }

    this.forwardTimeout = setTimeout(() => {
      this.showForwardIndicator = false
    }, 1500)
  }

  handleBackward(): void {
    const skipAmount = this.skipAmount
    this.videoElement.nativeElement.currentTime -= skipAmount
    this.handleProgressBar()
    this.handleMainStateIcon('<i class="fa-solid fa-backward"></i>')

    this.showBackwardIndicator = true

    if (this.backwardTimeout) {
      clearTimeout(this.backwardTimeout)
    }

    this.backwardTimeout = setTimeout(() => {
      this.showBackwardIndicator = false
    }, 1500)
  }

  handleMainStateIcon(icon: string): void {
    this.mainState.nativeElement.classList.add("animate-state")
    this.mainState.nativeElement.innerHTML = icon
  }

  onMainStateAnimationEnd(): void {
    this.mainState.nativeElement.classList.remove("animate-state")
    if (!this.isPlaying) {
      this.mainState.nativeElement.innerHTML = '<i class="fa-solid fa-play"></i>'
    }
    if (document.pictureInPictureElement) {
      this.mainState.nativeElement.innerHTML = '<i class="pi pi-desktop"></i>'
    }
  }

  toggleTheater(): void {
    this.isTheater = !this.isTheater
    this.videoContainer.nativeElement.classList.toggle("theater")
    if (this.isTheater) {
      this.handleMainStateIcon('<i class="pi pi-tablet"></i>')
    } else {
      this.handleMainStateIcon('<i class="pi pi-desktop"></i>')
    }
  }

  toggleMiniPlayer(): void {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture()
      this.isPictureInPicture = false
      this.handleMainStateIcon('<i class="pi pi-window"></i>')
    } else {
      this.videoElement.nativeElement.requestPictureInPicture()
      this.isPictureInPicture = true
      this.handleMainStateIcon('<i class="pi pi-images"></i>')
    }
  }

  handleSettingMenu(): void {
    if (this.settingMenu.nativeElement.classList.contains('show-setting-menu')) {
      this.settingMenu.nativeElement.classList.remove('show-setting-menu');
    } else {
      this.settingMenu.nativeElement.classList.add('show-setting-menu');
    }
  }

  handlePlaybackRate(value: number): void {
    this.videoElement.nativeElement.playbackRate = value
    this.playbackRate = value

    const speedButtons = this.settingMenu.nativeElement.querySelectorAll("li")
    speedButtons.forEach((btn: HTMLElement) => {
      if (Number.parseFloat(btn.getAttribute("data-value") || "1") === value) {
        btn.classList.add("speed-active")
      } else {
        btn.classList.remove("speed-active")
      }
    })

    this.handleMainStateIcon(`<span style="font-size: 1.4rem">${value}x</span>`)

    this.settingMenu.nativeElement.classList.remove("show-setting-menu")
  }

  @HostListener("document:keydown", ["$event"])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const tagName = document.activeElement?.tagName.toLowerCase()
    if (tagName === "input") return

    if (event.key.match(/[0-9]/gi)) {
      const num = Number.parseInt(event.key)
      this.videoElement.nativeElement.currentTime = (this.videoElement.nativeElement.duration / 100) * (num * 10)
      this.currentTime.nativeElement.style.width = num * 10 + "%"
    }

    switch (event.key.toLowerCase()) {
      case " ":
        if (tagName === "button") return
        if (this.isPlaying) {
          this.videoElement.nativeElement.pause()
        } else {
          this.videoElement.nativeElement.play()
        }
        break
      case "f":
        this.toggleFullscreen()
        break
      case "arrowright":
        this.handleForward()
        break
      case "arrowleft":
        this.handleBackward()
        break
      case "t":
        this.toggleTheater()
        break
      case "i":
        this.toggleMiniPlayer()
        break
      case "m":
        this.toggleMuteUnmute()
        break
      case "+":
        if (this.videoElement.nativeElement.playbackRate < 2) {
          this.videoElement.nativeElement.playbackRate += 0.25
          this.playbackRate = this.videoElement.nativeElement.playbackRate
          this.handleMainStateIcon(`<span style="font-size: 1.4rem">${this.playbackRate}x</span>`)
        }
        break
      case "-":
        if (this.videoElement.nativeElement.playbackRate > 0.25) {
          this.videoElement.nativeElement.playbackRate -= 0.25
          this.playbackRate = this.videoElement.nativeElement.playbackRate
          this.handleMainStateIcon(`<span style="font-size: 1.4rem">${this.playbackRate}x</span>`)
        }
        break
    }
  }

  onVideoTouchStart(event: TouchEvent): void {
    event.stopPropagation();
    this.videoTouchStartX = event.touches[0].clientX;
    this.settingMenu.nativeElement.classList.remove('show-setting-menu');
  }

  onVideoTap(event: TouchEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const now = new Date().getTime();
    const timeDiff = now - this.lastTap;

    const touchX = event.changedTouches[0].clientX;

    const containerRect = this.videoContainer.nativeElement.getBoundingClientRect();
    const containerCenter = containerRect.left + (containerRect.width / 2);

    const tapPosition = touchX < containerCenter ? 'left' : 'right';

    console.log("Tap detected at:", touchX, "Container center:", containerCenter, "Position:", tapPosition);

    if (timeDiff < this.doubleTapDelay && timeDiff > 0) {
      if (this.singleTapTimeout) {
        clearTimeout(this.singleTapTimeout);
        this.singleTapTimeout = null;
        this.isTapPending = false;
      }

      console.log("Double tap detected on", tapPosition);

      if (tapPosition === 'right') {
        this.handleForward();
      } else {
        this.handleBackward();
      }
    } else {
      if (this.singleTapTimeout) {
        clearTimeout(this.singleTapTimeout);
      }

      this.isTapPending = true;
      this.singleTapTimeout = setTimeout(() => {
        if (this.isTapPending) {
          console.log("Single tap executed");
          if (!this.isEventPathIncludesControls(event as any)) {
            if (!this.isPlaying) {
              this.play();
            } else {
              this.pause();
            }
          }
          this.isTapPending = false;
        }
      }, this.doubleTapDelay + 10);
    }
    this.settingMenu.nativeElement.classList.remove('show-setting-menu');

    this.lastTap = now;
  }


  @HostListener("document:fullscreenchange", [])
  onFullscreenChange(): void {
    if (!document.fullscreenElement) {
      this.isFullscreen = false

      setTimeout(() => {
        const container = this.videoContainer.nativeElement

        container.style.position = "relative"
        container.style.top = "auto"
        container.style.left = "auto"
        container.style.right = "auto"
        container.style.bottom = "auto"

        if (window.innerWidth <= 768) {
          container.style.width = "100%"
          container.style.height = "auto"
          container.style.aspectRatio = "16/9"
        } else {
          container.style.width = "1024px"
          container.style.height = "calc((9 / 16) * 1024px)"
        }

        void container.offsetWidth

        this.controls.nativeElement.classList.add("show-controls")
      }, 150)
    }
  }

  togglePlay(event: MouseEvent | TouchEvent): void {
    if (event.type !== 'touchend' || !this.isTapPending) {
      if (!this.isEventPathIncludesControls(event as any)) {
        if (!this.isPlaying) {
          this.play();
        } else {
          this.pause();
        }
      }
    }
  }
}
