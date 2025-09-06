import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  readonly footerText = `&copy; ${new Date().getFullYear()} Vision AI. All rights reserved.`;
  theme: 'dark' | 'light' = 'dark';
  private storageKey = 'vision-theme';

  // Hero marquee image groups (varying widths) - placeholder assets to be swapped later
  marqueeRows = [
    [
      { src: 'assets/marquee/hero1.jpg', w: 275 },
      { src: 'assets/marquee/hero2.jpg', w: 175 },
      { src: 'assets/marquee/hero3.jpg', w: 550 },
      { src: 'assets/marquee/hero4.jpg', w: 275 },
      { src: 'assets/marquee/hero5.jpg', w: 175 }
    ],
    [
      { src: 'assets/marquee/hero6.jpg', w: 175 },
      { src: 'assets/marquee/hero7.jpg', w: 550 },
      { src: 'assets/marquee/hero8.jpg', w: 275 },
      { src: 'assets/marquee/hero9.jpg', w: 175 },
      { src: 'assets/marquee/hero10.jpg', w: 275 }
    ]
  ];

  testimonials = [
    { type: 'video', thumb: 'assets/testimonials/t1.jpg', name: 'Aarav', role: 'Engineer', platform: 'linkedin', text: 'Helped me accelerate prototyping.' },
    { type: 'text', name: 'Maya', role: 'Product Designer', avatar: 'assets/avatars/a1.jpg', platform: 'x', text: 'Structure + clarity makes it my daily AI companion.' },
    { type: 'video', thumb: 'assets/testimonials/t2.jpg', name: 'Leo', role: 'Founder', platform: 'linkedin', text: 'Great leverage for small teams.' },
    { type: 'text', name: 'Sana', role: 'Analyst', avatar: 'assets/avatars/a2.jpg', platform: 'x', text: 'Formatting precision saves hours each week.' }
  ];

  businessFeatures = [
    { icon: 'assets/icons/self-paced.svg', title: 'Self-Paced Videos', desc: 'Flexible bites sized modules for busy schedules.' },
    { icon: 'assets/icons/office-hours.svg', title: 'Office Hours', desc: 'Mentor time to unblock teams fast.' },
    { icon: 'assets/icons/projects.svg', title: 'Project Driven', desc: 'Outcome aligned implementation sprints.' },
    { icon: 'assets/icons/network.svg', title: 'Learner Network', desc: 'Access a growing expert community.' }
  ];

  brandLogos = [
    'assets/brands/uber.svg','assets/brands/dominos.svg','assets/brands/shell.svg','assets/brands/adobe.svg','assets/brands/tesla.svg','assets/brands/meta.svg','assets/brands/google.svg','assets/brands/nvidia.svg'
  ];

  investors = [
    { img: 'assets/investors/in1.jpg', name: 'Kunal Shah', role: 'Founder, Cred' },
    { img: 'assets/investors/in2.jpg', name: 'Jensen Huang', role: 'CEO, NVIDIA' },
    { img: 'assets/investors/in3.jpg', name: 'Austen Alred', role: 'Founder, Gauntlet AI' },
    { img: 'assets/investors/in4.jpg', name: 'Eric Siu', role: 'Founder, SingleGrain' },
    { img: 'assets/investors/in5.jpg', name: 'Justin Caldbeck', role: 'Investor, SpaceX/Uber' },
    { img: 'assets/investors/in6.jpg', name: 'Ankit Jain', role: 'GenAI Leader, Meta' }
  ];

  newsletterEmail = '';

  submitNewsletter() {
    // Placeholder; integrate with backend service or Beehiiv API proxy
    console.log('Subscribe:', this.newsletterEmail);
    this.newsletterEmail = '';
  }

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey) as 'light' | 'dark' | null;
    if (saved) {
      this.applyTheme(saved);
    } else {
      // Prefer system
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      this.applyTheme(prefersLight ? 'light' : 'dark');
    }
  }

  toggleTheme() {
    this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private applyTheme(next: 'dark' | 'light') {
    this.theme = next;
    if (next === 'light') {
      document.body.setAttribute('data-theme','light');
    } else {
      document.body.removeAttribute('data-theme');
    }
    localStorage.setItem(this.storageKey, next);
  }
}
