fetch('products.json')
.then(res=>res.json())
.then(data=>{
  const container=document.getElementById('products');
  data.forEach(p=>{
    container.innerHTML+=`
      <div>
        <h2>${p.brand} ${p.name}</h2>
        <img src="${p.image}">
        <p>Preço: R$ ${p.price}</p>
        <p>Numeração: ${p.sizes}</p>
        <a href="https://wa.me/5513974125369" target="_blank">Comprar no WhatsApp</a>
      </div>
      <hr>
    `
  })
})