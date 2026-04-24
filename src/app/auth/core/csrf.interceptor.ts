import { HttpInterceptorFn } from "@angular/common/http";

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {

  // Lire le cookie csrftoken posé par Django
  const csrfToken = getCookie('csrftoken');

  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (csrfToken && mutationMethods.includes(req.method)) {
    const cloned = req.clone({
      headers: req.headers.set('X-CSRFToken', csrfToken),
      withCredentials: true,
    });
    return next(cloned);
  }
  return next(req);

  //if (!mutationMethods.includes(req.method)) return next(req);

  //const match = document.cookie.match(/csrftoken=([^;]+)/);
  //const token = match ? decodeURIComponent(match[1]) : '';
  //if (!token) return next(req);

  //const cloned = req.clone({
  //  headers: req.headers.set('X-CSRFToken', token)
  //});
  //return next(cloned);
};

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift() ?? null;
  return null;
}