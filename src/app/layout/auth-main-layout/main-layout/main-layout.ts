import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from "@angular/router";
import { LangoSidebar } from "../../lango-sidebar/lango-sidebar";
import { SidebarService } from '../../service/sidebar.service';
import { Header } from "../../header/header";

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LangoSidebar, Header],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayout {
  sidebar = inject(SidebarService);
}