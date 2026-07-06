with open('frontend/vite.config.js', 'r') as f:
    content = f.read()

# Add pinggy host to the allowedHosts array
if 'upccg-2401-4900-1ca3-6812-710c-a25e-169d-8951.free.pinggy.net' not in content:
    content = content.replace(
        "allowedHosts: ['better-jokes-peel.loca.lt', 'localhost'],",
        "allowedHosts: ['better-jokes-peel.loca.lt', 'localhost', 'upccg-2401-4900-1ca3-6812-710c-a25e-169d-8951.free.pinggy.net', 'ehphs-2401-4900-1ca3-6812-710c-a25e-169d-8951.run.pinggy-free.link'],"
    )
    with open('frontend/vite.config.js', 'w') as f:
        f.write(content)
