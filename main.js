document.addEventListener('DOMContentLoaded', () => {
            const typingTextElement = document.querySelector('.typing-text');
            const texts = ["WEB DEVELOP.", "JS DEVELOP.",];
            let textIndex = 0;
            let charIndex = 0;
            let isDeleting = false;

            function typeWriter() {
                const currentText = texts[textIndex];
                if (isDeleting) {
                    typingTextElement.textContent = currentText.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    typingTextElement.textContent = currentText.substring(0, charIndex + 1);
                    charIndex++;
                }

                
                typingTextElement.setAttribute('data-glitch', typingTextElement.textContent);

                let typeSpeed = 100; 
                if (isDeleting) {
                    typeSpeed /= 2; 
                }

                if (!isDeleting && charIndex === currentText.length) {
                    typeSpeed = 2000; 
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    textIndex = (textIndex + 1) % texts.length;
                    typeSpeed = 500; 
                }

                setTimeout(typeWriter, typeSpeed);
            }

            typeWriter();

            document.querySelectorAll('.main-nav a, .cta-button').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href');
                    if (targetId.startsWith('#')) { 
                        document.querySelector(targetId).scrollIntoView({
                            behavior: 'smooth'
                        });

                        const mainNav = document.querySelector('.main-nav');
                        if (mainNav.classList.contains('active')) {
                            mainNav.classList.remove('active');
                            document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
                        }
                    }
                });
            });

            const menuToggle = document.querySelector('.menu-toggle');
            const mainNav = document.querySelector('.main-nav');

            menuToggle.addEventListener('click', () => {
                const expanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
                menuToggle.setAttribute('aria-expanded', !expanded);
                mainNav.classList.toggle('active');
            });

        });


        //копирование текста
        function copyTextToClipboard(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            
            
            textarea.select();
            textarea.setSelectionRange(0, 99999); 
            try {
                const successful = document.execCommand('copy');
                const msg = successful ? 'успешно' : 'неудачно';
                console.log('Копирование ' + msg);
                showNotification();
            } catch (err) {
                console.error('Ошибка при копировании: ', err);
                navigator.clipboard.writeText(text).then(() => {
                    showNotification();
                }).catch(err => {
                    console.error('Ошибка Clipboard API: ', err);
                });
            }
            document.body.removeChild(textarea);
        }

        
        function showNotification() {
            const notification = document.getElementById('copyNotification');
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 2000);
        }

        
        document.addEventListener('DOMContentLoaded', function() {
            const copyLinks = document.querySelectorAll('.copy-link');
            copyLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault(); 
                    const textToCopy = this.getAttribute('data-copy-text');
                    if (textToCopy) {
                        copyTextToClipboard(textToCopy);
                    }
                });
            });
        });

      
        function copyTextModern(text) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showNotification();
                }).catch(err => {
                    console.error('Ошибка при копировании: ', err);
                    copyTextToClipboard(text);
                });
            } else {
                copyTextToClipboard(text);
            }
        }