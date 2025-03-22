import { Component } from '@angular/core';
import { VideoPlayerComponent } from "./video-player/video-player.component";

@Component({
  selector: 'app-root',
  imports: [VideoPlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'video-player';
}
